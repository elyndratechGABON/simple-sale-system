// Groupes : deux écrans rattachés par le même mot clé partagent le même shopId, un
// autre compte par mot clé forme un autre groupe, et la jonction à un compte existant
// ne produit jamais un rôle propriétaire (RÉGRESSION).
import { describe, it, expect } from "vitest";
import { ensureShopProfile, setShopAccount, setShopKeyword } from "../db";
import {
  ensureIdentity,
  resetDeviceIdentity,
  resetIdentityForTests,
  setIdentityRole,
} from "./identity";
import { isOwnerIdentity } from "./pairing";
import { ACCOUNT, freshDevice } from "./pairing-helpers";

describe("groupes", () => {
  it("deux écrans rattachés par le même mot clé partagent le même shopId", async () => {
    await freshDevice();
    await ensureShopProfile("Boutique");
    await setShopKeyword("ABCD-EFGH");
    const idA = await ensureIdentity();
    expect(idA.shopId.startsWith("s_")).toBe(true);
    const idB = await resetDeviceIdentity(); // le profil (donc le mot clé) persiste
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idB.shopId).toBe(idA.shopId);

    // Un AUTRE compte par mot clé → un autre groupe, jamais de croisement.
    await setShopKeyword("ZZZZ-AAAA");
    const idC = await resetDeviceIdentity();
    expect(idC.shopId).not.toBe(idA.shopId);
  });

  it("l'identité du nouveau venu porte le rôle à annoncer", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    expect(isOwnerIdentity()).toBe(true); // défaut : le premier écran est le principal
    await setIdentityRole("employee");
    expect(isOwnerIdentity()).toBe(false);
  });

  // RÈGRESSION : un écran qui REJOINT un compte existant (scan du QR, mot clé,
  // téléphone+mot de passe) doit terminer EMPLOYÉ — pas un second propriétaire.
  // Sans le `setIdentityRole("employee")` forcé par l'assistant de jonction, un
  // appareil neuf (aucune ligne `role`) relisait "owner" après rechargement et
  // héritait de tous les accès du propriétaire (stock, équipe, abonnements…).
  it("la jonction à un compte existant ne produit jamais un rôle propriétaire", async () => {
    await freshDevice();
    await ensureShopProfile("Boutique");
    await setShopAccount({ name: "Proprio", phone: "+241060000", password: "" });
    // Simule EXACTEMENT l'assistant de jonction : identité chargée puis rôle employé forcé.
    await ensureIdentity();
    await setIdentityRole("employee");

    // Relit l'identité depuis la base (cache vidé), comme au redémarrage de l'app.
    resetIdentityForTests();
    const identity = await ensureIdentity();
    expect(identity.role).toBe("employee");
    expect(isOwnerIdentity()).toBe(false);
  });
});
