// Décision d'application du code (côté principal) : un code juste appaire l'écran
// d'office et épingle sa clé, un mauvais ou un expiré le laisse en attente, et aucun
// écran ne se promeut propriétaire en re-annonçant.
import { describe, it, expect } from "vitest";
import { getDB, setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity, getDeviceKeys, getIdentity } from "./identity";
import { approveDevice, generatePairingCode } from "./pairing";
import { listPairedDevices } from "./peers";
import { listPendingOps } from "./outbox";
import { PAIRING_KEYS } from "./types";
import { ACCOUNT, announceOp, freshDevice } from "./pairing-helpers";

describe("décision d'application du code (côté principal)", () => {
  it("un code juste appaire l'écran d'office (clé publique, nom, rôle, date)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const shopId = getIdentity().shopId;

    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-juste", 1, {
        employee_name: "Vendeuse",
        employee_phone: "0761234567",
        pair_code: code,
      }),
    ]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-juste");
    expect(peer?.status).toBe("paired");
    expect(peer?.role).toBe("employee");
    expect(peer?.device_name).toBe("Vendeuse");
    // Le numéro voyage dans la MÊME annonce que le nom : c'est ce que le propriétaire
    // affiche dans « Activité du personnel ». Il n'est jamais déduit, seulement déclaré.
    expect(peer?.phone).toBe("0761234567");
    // La clé est PINSÉE : c'est elle qui permettra de vérifier les ops suivantes du pair.
    expect(peer?.public_key).toBe(getDeviceKeys().publicKey);
    expect(peer?.paired_at).toBeDefined();
  });

  it("un mauvais code laisse l'écran en attente (pas de date de pair), l'approbation le pair", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await generatePairingCode(); // le code du principal est « autre » que celui du pair
    const shopId = getIdentity().shopId;

    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-intrus", 1, {
        employee_name: "Intrus",
        pair_code: "ZZZZZZ",
      }),
    ]);
    let peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-intrus");
    expect(peer?.status).toBe("pending");
    expect(peer?.paired_at).toBeUndefined();

    // Approbation manuelle → la décision est écrite en local et une op part aux autres.
    await approveDevice("device-intrus", "employee");
    peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-intrus");
    expect(peer?.status).toBe("paired");
    expect((await listPendingOps(shopId)).some((o) => o.type === "device.approve")).toBe(true);
  });

  it("un code expiré est refusé comme un mauvais code", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    await getDB().settings.put({ key: PAIRING_KEYS.codeExpiresAt, value: Date.now() - 1000 });
    const shopId = getIdentity().shopId;

    await applyRemoteOpsSigned([await announceOp(shopId, "device-tardif", 1, { pair_code: code })]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-tardif");
    expect(peer?.status).toBe("pending");
  });

  it("une annonce sans code n'est acceptée que pour un rôle de confiance (owner)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;

    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-boss", 1, { role: "owner", employee_name: "Chef" }),
      await announceOp(shopId, "device-inconnu", 2, { pair_code: undefined }),
    ]);
    const peers = await listPairedDevices(shopId);
    expect(peers.find((p) => p.id === "device-boss")?.status).toBe("paired");
    expect(peers.find((p) => p.id === "device-inconnu")?.status).toBe("pending");
  });

  it("un employé pairé ne se promeut pas propriétaire en re-annonçant", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;

    // L'écran s'est présenté avec un mauvais code (pending), le principal l'a approuvé employé.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-e8", 1, { employee_name: "Vendeuse", pair_code: "ZZZZZZ" }),
    ]);
    await approveDevice("device-e8", "employee");

    // Il RE-annonce en se prétendant propriétaire, sans aucun code.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-e8", 2, { role: "owner", pair_code: undefined }),
    ]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-e8");
    expect(peer?.status).toBe("paired"); // déjà pairé : le statut ne bouge pas
    expect(peer?.role).toBe("employee"); // mais le rôle n'a PAS été promu
  });

  it("un écran resté pending ne passe pas pairé en se prétendant propriétaire", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;

    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-p", 1, { employee_name: "Intrus", pair_code: "ZZZZZZ" }),
    ]);
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-p", 2, { role: "owner", pair_code: undefined }),
    ]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-p");
    expect(peer?.status).toBe("pending");
    expect(peer?.paired_at).toBeUndefined();
  });
});
