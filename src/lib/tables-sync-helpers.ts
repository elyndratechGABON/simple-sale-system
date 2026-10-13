import { listProducts, resetDBForTests, setShopAccount } from "./db";
import { announceDevice } from "./syncengine/pairing";
import { ensureIdentity, resetIdentityForTests } from "./syncengine/identity";

export const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };
export const CATEGORY = "Boisson" as const;
export const PRODUCT = { name: "Coca 1L", price: 600, cost: 300, stock: 10, category: CATEGORY };
export const LINE = (productId: string, quantity = 2) => ({
  product_id: productId,
  name: "Coca 1L",
  price: 600,
  cost: 300,
  category: CATEGORY,
  quantity,
});
export const FREE_LINE = {
  name: "Coiffure",
  price: 500,
  cost: 100,
  category: CATEGORY,
  quantity: 2,
};

/** Caisse neuve du compte : même shopId que les autres appareils.
 *
 *  Elle S'ANNONCE aussi. En production c'est l'onboarding qui le fait, et l'annonce
 *  porte la clé publique de l'appareil : sans elle au registre du pair, celui-ci n'a
 *  rien contre quoi vérifier les ops reçues et les refuse. */
export async function onAccount(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
  await setShopAccount(ACCOUNT);
  await ensureIdentity();
  await announceDevice();
}

export const stockOf = async (productId: string): Promise<number> =>
  (await listProducts()).find((p) => p.id === productId)?.stock ?? 0;
