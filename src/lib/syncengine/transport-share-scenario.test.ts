// Scénario complet de partage (mission Étape 4.3) : sélection de 3 produits pour un
// employé, nouveau produit public qui LE REJOINT (toggle ON par défaut), produit privé
// invisible, modification propagée, suppression partagée => tombstone, suppression
// privée => silence. Les assertions portent sur ce que LE RELAIS détient (le contenu
// exact que l'employé recevra) — la réception d'un snapshot et d'une tombstone est
// couverte par transport-snapshot-merge et apply/products.
import { describe, it, expect } from "vitest";
import {
  addProduct,
  deleteProduct,
  getDB,
  listProducts,
  setShopAccount,
  updateProduct,
} from "../db";
import { ensureIdentity, getIdentity } from "./identity";
import { exchangeOps } from "./transport";
import { saveShareDecision } from "./sharing";
import { ACCOUNT, freshDevice, makeRelay, pairPeer } from "./transport-helpers";
import type { CatalogueSnapshotPayload } from "./types";

/** Les instantanés du relais adressés à l'employé, avec leurs produits. */
async function partsPour(relay: ReturnType<typeof makeRelay>, target: string) {
  const remote = await relay.client.pull(getIdentity().shopId, "capteur");
  return remote
    .filter((o) => o.type === "catalogue.snapshot")
    .map((o) => o.payload as CatalogueSnapshotPayload)
    .filter((p) => p.target_device_id === target);
}

describe("scénario complet de partage de stock", () => {
  it("sélection de 3 → private invisible, public rejoint, retouche et tombstone partent, privé supprimé ne dit rien", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();
    await pairPeer("employe");
    await getDB().paired_devices.update("employe", { device_name: "Employé A" });

    // Le patron a DIX produits.
    const ids: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const p = await addProduct({
        name: `Article ${i}`,
        price: 100 * i,
        cost: 50 * i,
        category: "Autre",
        stock: i,
      });
      ids.push(p.id);
    }

    // Il sélectionne TROIS produits pour l'employé A.
    await saveShareDecision("employe", "selection", [ids[0], ids[1], ids[2]]);

    await exchangeOps(relay.client);
    let parts = await partsPour(relay, "employe");
    expect(parts).toHaveLength(1);
    expect(parts[0].products.map((p) => p.id).sort()).toEqual([ids[0], ids[1], ids[2]].sort());
    // Le dernier instantané au relais EST la source de vérité que l'employé applique.
    const dernier = () => parts.at(-1)!;

    // NOUVEAU produit PUBLIC : le toggle « Partager avec mon équipe » est ON par
    // défaut — il rejoint la sélection et l'employé A le voit au prochain cycle.
    const publicNouveau = await addProduct({
      name: "Nouveau public",
      price: 500,
      cost: 250,
      category: "Autre",
      stock: 5,
    });
    await getDB().paired_devices.update("employe", { shared_published_at: 0 });
    await exchangeOps(relay.client);
    parts = await partsPour(relay, "employe");
    expect(dernier().products.map((p) => p.id)).toContain(publicNouveau.id);

    // NOUVEAU produit PRIVÉ : son catalogue n'arrive QUE sur son écran.
    const priveNouveau = await addProduct({
      name: "Coffre-fort",
      price: 50000,
      cost: 50000,
      category: "Autre",
      stock: 1,
      is_private: true,
    });
    await getDB().paired_devices.update("employe", { shared_published_at: 0 });
    await exchangeOps(relay.client);
    parts = await partsPour(relay, "employe");
    expect(dernier().products.map((p) => p.id)).not.toContain(priveNouveau.id);

    // MODIFICATION d'un produit partagé (prix) : l'employé A la voit.
    const modifie = await listProducts().then((l) => l.find((p) => p.id === ids[1]));
    await updateProduct({ ...modifie!, price: 999 });
    await getDB().paired_devices.update("employe", { shared_published_at: 0 });
    await exchangeOps(relay.client);
    parts = await partsPour(relay, "employe");
    expect(dernier().products.find((p) => p.id === ids[1])?.price).toBe(999);

    // SUPPRESSION d'un produit PARTAGÉ : la tombstone part au relais — appliquée
    // chez l'employé, sa fiche meurt aussi (l'absence seule ne supprime rien).
    await deleteProduct(ids[0]);
    // La réémission après suppression : le catalogue du patron a changé — la
    // tombstone du produit retiré doit être au relais pour l'employé.
    await getDB().paired_devices.update("employe", { shared_published_at: 0 });
    await exchangeOps(relay.client);
    parts = await partsPour(relay, "employe");
    const tombstonePart = dernier().products.find((p) => p.id === ids[0]);
    expect(tombstonePart?.deleted_at).toBeDefined();

    // SUPPRESSION d'un produit PRIVÉ : rien ne repart — sa pierre tombale n'a
    // rien à faire au relais des employés (ils ne l'ont jamais reçu).
    await deleteProduct(priveNouveau.id);
    await getDB().paired_devices.update("employe", { shared_published_at: 0 });
    await exchangeOps(relay.client);
    parts = await partsPour(relay, "employe");
    const dernierApres = dernier();
    expect(dernierApres.products.some((p) => p.id === priveNouveau.id)).toBe(false);
    // ...et le MARQUAGE local chez le patron est fait.
    const local = await listProducts();
    expect(local.find((p) => p.id === priveNouveau.id)).toBeUndefined();
  });
});
