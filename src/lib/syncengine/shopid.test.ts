// Le `shopId` est la clé d'isolation des groupes de partage, et le relais s'y fie
// aveuglément. Ce que ces tests verrouillent : un `accountId` du serveur PRIME sur la
// dérivation locale (non énumérable), deux appareils du même compte convergent, deux
// comptes distincts ne se croisent jamais.
import { describe, it, expect } from "vitest";
import { getShopProfile, resetDBForTests, setShopAccount, setShopAccountId } from "../db";
import { ensureIdentity, resetIdentityForTests } from "./identity";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };

async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

describe("shopId : source d'autorité", () => {
  it("dérive du téléphone+nom en l'absence d'identifiant serveur", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const id = await ensureIdentity();
    expect(id.shopId.startsWith("s_")).toBe(true);
  });

  it("privilégie l'identifiant opaque du serveur", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await setShopAccountId("acct_9f2c41ab7e");
    const id = await ensureIdentity();
    expect(id.shopId).toBe("s_acct_9f2c41ab7e");
  });

  it("convergence : deux écrans du MÊME compte et du même identifiant se rejoignent", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await setShopAccountId("acct_partage");
    const a = await ensureIdentity();

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await setShopAccountId("acct_partage");
    const b = await ensureIdentity();

    expect(b.deviceId).not.toBe(a.deviceId);
    expect(b.shopId).toBe(a.shopId);
  });

  it("séparation : deux identifiants distincts ne se croisent JAMAIS", async () => {
    // Même téléphone, même nom de boutique — seule l'identité serveur diffère. Avec la
    // seule dérivation locale, ces deux comptes seraient le MÊME groupe.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await setShopAccountId("acct_alpha");
    const a = await ensureIdentity();

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await setShopAccountId("acct_beta");
    const b = await ensureIdentity();

    expect(b.shopId).not.toBe(a.shopId);
  });

  it("retombe sur la dérivation locale si l'identifiant serveur est effacé", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await setShopAccountId("acct_1");
    const withId = await ensureIdentity();

    await setShopAccountId(null);
    resetIdentityForTests();
    const withoutId = await ensureIdentity();

    expect(withoutId.shopId).not.toBe(withId.shopId);
    expect(withoutId.shopId.startsWith("s_")).toBe(true);
    expect((await getShopProfile())?.accountId).toBeUndefined();
  });

  it("n'invente pas d'identifiant : la fiche reste vierge tant que le serveur n'envoie rien", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    expect((await getShopProfile())?.accountId).toBeUndefined();
  });
});
