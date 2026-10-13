// Constantes et helpers partagés par les tests du moteur de synchronisation.
import { resetDBForTests } from "../db";
import { resetIdentityForTests } from "./identity";

export const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };
export const LINE = (productId: string) => ({
  product_id: productId,
  name: "Coca 1L",
  price: 600,
  cost: 300,
  category: "Boisson" as const,
  quantity: 2,
});

/** Réinitialise la base + le cache d'identité : simule un appareil neuf. */
export async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}
