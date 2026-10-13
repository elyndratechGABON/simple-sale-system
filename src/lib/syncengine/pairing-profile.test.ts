// Ré-annonce de fiche : une fiche inchangée ne ré-annonce pas, un numéro corrigé part
// avec la nouvelle valeur, et côté patron la fiche se met à jour sans désapprouver
// l'écran. Les annonces en attente pour cet appareil.
import { describe, it, expect } from "vitest";
import { setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import {
  ensureIdentity,
  getIdentity,
  setIdentityEmployeeName,
  setIdentityEmployeePhone,
  setIdentityRole,
} from "./identity";
import { enterPairingCode, generatePairingCode, reannounceProfile } from "./pairing";
import { listPairedDevices } from "./peers";
import { listPendingOps } from "./outbox";
import { ACCOUNT, announceOp, freshDevice } from "./pairing-helpers";

describe("ré-annonce de fiche (le patron voit le numéro tout de suite)", () => {
  /** Les annonces en attente pour cet appareil. */
  const announces = async () =>
    (await listPendingOps(getIdentity().shopId)).filter((o) => o.type === "device.announce");

  it("une fiche inchangée ne ré-annonce pas", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await setIdentityEmployeeName("Fatou");
    await setIdentityEmployeePhone("0761234567");
    await enterPairingCode("A2B2C3");
    expect(await announces()).toHaveLength(1);

    await reannounceProfile();
    await reannounceProfile();
    // Le one-shot de l'appairage tient : deux aller-retours ne produisent pas deux ops,
    // donc l'écran ne repasse pas « à approuver » chez le patron.
    expect(await announces()).toHaveLength(1);
  });

  it("un numéro corrigé ré-annonce avec la nouvelle valeur", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await setIdentityEmployeeName("Fatou");
    await setIdentityEmployeePhone("0761111111");
    await enterPairingCode("A2B2C3");

    await setIdentityEmployeePhone("0762222222");
    await reannounceProfile();

    const ops = await announces();
    expect(ops).toHaveLength(2);
    const dernier = ops[1].payload as { employee_phone?: string };
    // C'est la correction qui doit repartir, pas l'ancienne valeur.
    expect(dernier.employee_phone).toBe("0762222222");
  });

  it("côté patron : la ré-annonce met la fiche à jour sans désapprouver l'écran", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const shopId = getIdentity().shopId;

    // L'employé s'annonce et est appairé d'office (code juste).
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-fatou", 1, {
        employee_name: "Fatou",
        employee_phone: "0761111111",
        pair_code: code,
      }),
    ]);
    expect((await listPairedDevices(shopId)).find((p) => p.id === "device-fatou")?.status).toBe(
      "paired",
    );

    // Il corrige son numéro et se ré-annonce, SANS code.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-fatou", 2, {
        employee_name: "Fatou",
        employee_phone: "0762222222",
      }),
    ]);

    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-fatou");
    expect(peer?.phone).toBe("0762222222");
    expect(peer?.device_name).toBe("Fatou");
    // Ré-annoncé n'est pas « désapprouvé » : sinon l'écran repartirait « à approuver ».
    expect(peer?.status).toBe("paired");
    expect(peer?.role).toBe("employee");
  });

  it("le code de paire ne se rejoue pas sur une ré-annonce de fiche", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await enterPairingCode("A2B2C3");

    // Un code rejoué après coup donnerait à n'importe quel écran le droit de s'appairer
    // bien après l'expiration de la fenêtre de 8 minutes.
    await enterPairingCode("D4E5F6");
    expect(await announces()).toHaveLength(1);
  });
});
