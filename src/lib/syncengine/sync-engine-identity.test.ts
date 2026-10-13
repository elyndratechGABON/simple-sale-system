// Identité du moteur de synchronisation local-first : identité stable par appareil et
// regroupement sous un même `shopId` pour deux appareils d'un même compte.
import { describe, it, expect } from "vitest";
import { setShopAccount } from "../db";
import {
  ensureIdentity,
  getDeviceKeys,
  getIdentity,
  resetDeviceIdentity,
  resetIdentityForTests,
} from "./identity";
import { ACCOUNT } from "./sync-engine-helpers";

describe("identité", () => {
  it("crée une identité stable par appareil (deviceId + clé de signature)", async () => {
    await ensureIdentity();
    const a = getIdentity();
    expect(a.deviceId.length).toBeGreaterThan(0);
    // Pas de compte en base → groupe isolé, rien à partager.
    expect(a.shopId.startsWith("d_")).toBe(true);

    // ECDSA P-256 : la paire signe les opérations, c'est elle la preuve d'origine.
    const keys = getDeviceKeys();
    expect(JSON.parse(keys.publicKey).kty).toBe("EC");
    expect(JSON.parse(keys.publicKey).crv).toBe("P-256");
    expect(keys.privateKey.length).toBeGreaterThan(0);

    // Rechargement : l'identité persiste et ne change pas.
    resetIdentityForTests();
    const b = await ensureIdentity();
    expect(b.deviceId).toBe(a.deviceId);
    expect(b.shopId).toBe(a.shopId);
  });

  it("deux appareils du même compte partagent le même shopId", async () => {
    await setShopAccount(ACCOUNT);
    const idA = await ensureIdentity();
    // resetDeviceIdentity simule un second mobile.
    const idB = await resetDeviceIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idA.shopId).toBe(idB.shopId);
    expect(idA.shopId.startsWith("s_")).toBe(true);
  });
});
