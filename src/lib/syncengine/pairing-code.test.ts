// Code de paire : génération à courte durée de vie, une seule annonce par saisie,
// et le nom/numéro de l'employé qui voyagent dans l'annonce.
import { describe, it, expect } from "vitest";
import { setShopAccount } from "../db";
import { captureSigned } from "./__tests__/setup";
import {
  ensureIdentity,
  getIdentity,
  setIdentityEmployeeName,
  setIdentityEmployeePhone,
  setIdentityRole,
} from "./identity";
import {
  announceDevice,
  clearPairingCode,
  enterPairingCode,
  generatePairingCode,
  getPairingToken,
  pairCodeExpiry,
} from "./pairing";
import { listPendingOps } from "./outbox";
import { exchangeOps } from "./transport";
import { ACCOUNT, freshDevice, makeRelay } from "./pairing-helpers";

describe("code de paire", () => {
  it("génère un code à durée de vie courte, lisible tant qu'il est valide", async () => {
    await freshDevice();
    const code = await generatePairingCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await getPairingToken()).toBe(code);
    expect(await pairCodeExpiry()).toBeGreaterThan(Date.now());

    await clearPairingCode();
    expect(await getPairingToken()).toBeNull();
    expect(await pairCodeExpiry()).toBeNull();
  });

  it("un appareil sans compte n'a rien à annoncer", async () => {
    await freshDevice();
    await ensureIdentity();
    const before = (await captureSigned()).length;
    await announceDevice("ABCDEF");
    expect((await captureSigned()).length).toBe(before);
  });

  it("une saisie valide se présente au groupe une seule fois", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();
    const shopId = getIdentity().shopId;
    await enterPairingCode("A2B2C3");
    await enterPairingCode("D4E5F6"); // re-saisie : drapeau posé, pas de seconde annonce
    const announces = (await listPendingOps(shopId)).filter((o) => o.type === "device.announce");
    expect(announces).toHaveLength(1);
    await exchangeOps(relay.client);
    expect(relay.count(shopId)).toBe(1);
  });

  it("l'annonce porte le nom ET le numéro saisis par l'employé", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await setIdentityEmployeeName("  Vendeuse Fatou  ");
    await setIdentityEmployeePhone("  0761234567  ");
    await enterPairingCode("A2B2C3");

    // Une SEULE annonce doit suffire : le nom et le numéro sont posés AVANT l'appel
    // (cf. `welcome.tsx`). Si l'identité était réglée après, l'annonce porterait un nom
    // vide et il faudrait un second cycle — le patron ne voyait personne.
    expect(
      (await listPendingOps(getIdentity().shopId)).filter((o) => o.type === "device.announce"),
    ).toHaveLength(1);

    const announce = (await listPendingOps(getIdentity().shopId)).find(
      (o) => o.type === "device.announce",
    );
    const payload = announce?.payload as {
      employee_name?: string;
      employee_phone?: string;
      role?: string;
    };
    // Espaces coupés des deux côtés : le patron ne doit pas lire «  Vendeuse  ».
    expect(payload.employee_name).toBe("Vendeuse Fatou");
    expect(payload.employee_phone).toBe("0761234567");
    // Un employé qui n'a rien saisi ne porte ni le nom de la boutique (qui n'est pas
    // une personne) ni un numéro inventé.
    expect(payload.role).toBe("employee");
  });

  it("un employé sans nom ne s'annonce pas sous le nom de la boutique", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await enterPairingCode("A2B2C3");

    const announce = (await listPendingOps(getIdentity().shopId)).find(
      (o) => o.type === "device.announce",
    );
    const payload = announce?.payload as { employee_name?: string; employee_phone?: string };
    // Avant, ce champ recevait le nom de la boutique : le propriétaire lisait le nom du
    // commerce comme si c'était un vendeur, et ne pouvait pas distinguer deux employés.
    expect(payload.employee_name).toBe("");
    expect(payload.employee_phone).toBe("");
  });
});
