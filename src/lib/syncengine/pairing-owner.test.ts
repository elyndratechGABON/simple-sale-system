// Lecture du rôle : une annonce par code est TOUJOURS un employé, le rôle annoncé n'est
// qu'une déclaration de l'appareil, et le registre des pairs n'affiche jamais l'écran
// courant — pas même une fiche fantôme laissée par une approbation.
import { describe, it, expect } from "vitest";
import { getDB, setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity, getIdentity } from "./identity";
import { approveDevice, generatePairingCode } from "./pairing";
import { listPairedDevices } from "./peers";
import { listPendingOps } from "./outbox";
import { ACCOUNT, announceOp, freshDevice } from "./pairing-helpers";

describe("qui peut se déclarer propriétaire", () => {
  it("une annonce par code est TOUJOURS un employé, jamais un propriétaire", async () => {
    // Règle du produit : le QR ouvre un poste d'employé. Aucun scan, aucun appareil, et
    // aucune annonce forgée ne doit pouvoir créer un second compte propriétaire.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const shopId = getIdentity().shopId;

    // Un appareil inconnu se présente avec le BON code de paire, mais en se déclarant
    // `owner`. Le rôle annoncé n'est qu'une déclaration de l'appareil : seul le code compte.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-ambitieux", 1, {
        role: "owner",
        employee_name: "Faux propriétaire",
        pair_code: code,
      }),
    ]);

    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-ambitieux");
    expect(peer?.role).toBe("employee");
    expect(peer?.status).toBe("paired");
  });

  it("sans code, dans un groupe déjà peuplé, une annonce `owner` reste en attente", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const shopId = getIdentity().shopId;

    // Le groupe est peuplé : un employé s'appaire d'abord avec le code.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-legitime", 1, { employee_name: "Fatou", pair_code: code }),
    ]);

    // Puis un inconnu, sans code, se présente en se nommant propriétaire : ni appairé,
    // ni propriétaire — le rôle attend la décision du principal.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-intrus", 1, { role: "owner", employee_name: "Intrus" }),
    ]);

    const intrus = (await listPairedDevices(shopId)).find((p) => p.id === "device-intrus");
    // Selon le chemin, l'annonce est refusée (clé non épinglée) ou laissée en attente :
    // dans les deux cas elle n'est JAMAIS propriétaire, et jamais appairée d'office.
    expect(intrus?.role).not.toBe("owner");
    expect(intrus?.status).not.toBe("paired");
  });

  it("la première caisse d'un groupe vide reste le propriétaire", async () => {
    // Cas fondateur : personne d'autre autour, c'est cette caisse qui a créé la boutique.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;

    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-fondatrice", 1, {
        role: "owner",
        employee_name: "La boutique",
      }),
    ]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-fondatrice");
    expect(peer?.role).toBe("owner");
    expect(peer?.status).toBe("paired");
  });
});

describe("le registre ne contient pas l'écran courant", () => {
  it("lister les pairs exclut cet écran, même si sa fiche traîne en base", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const moi = getIdentity().deviceId;
    // Cas réel : une approbation ancienne, ou une op d'avant le filtre, a laissé une fiche
    // pour l'écran lui-même. Elle s'affichait dans « Activité du personnel » comme
    // « Écran sans nom » avec le rôle absent lu « Propriétaire ».
    await getDB().paired_devices.put({
      id: moi,
      shop_id: getIdentity().shopId,
      last_seen: Date.now(),
      updated_at: Date.now(),
    });
    await getDB().paired_devices.put({
      id: "employe-1",
      shop_id: getIdentity().shopId,
      device_name: "Fatou",
      role: "employee",
      status: "paired",
      updated_at: Date.now(),
    });

    const pairs = await listPairedDevices(getIdentity().shopId);
    expect(pairs.map((p) => p.id)).toEqual(["employe-1"]);
  });

  it("une approbation ne crée pas de fiche fantôme pour l'appareil approuveur", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const approuveur = getIdentity().deviceId;
    const boutique = getIdentity().shopId;

    // Le principal approuve un employé : l'op porte l'APPROUVÉ, l'approuveur n'a rien à
    // faire dans le registre de celui qui reçoit l'op.
    await approveDevice("employe-2", "employee");
    const op = (await listPendingOps(boutique)).find((o) => o.type === "device.approve");
    expect(op).toBeDefined();
    // On la fait appliquer par un AUTRE écran (simulé via la même base de test) :
    // aucune fiche ne doit apparaître pour l'approuveur.
    await applyRemoteOpsSigned([op!]);

    expect((await getDB().paired_devices.get(approuveur)) ?? null).toBeNull();
    // L'employé approuvé, lui, existe bien.
    expect(await getDB().paired_devices.get("employe-2")).toBeDefined();
  });
});
