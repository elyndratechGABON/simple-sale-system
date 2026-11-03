// Les photos ne voyagent que dans les DEUX seuls canaux d'image assumés : l'op dédiée
// `product.image_updated` (snapshot de partage) et la RETOUCHE produit — un
// `product.updated` porte le champ `photo` MODIFIÉ pour que les autres caisses voient
// la nouvelle image. Toujours exclu : la CRÉATION et le `catalogue.snapshot`, qui
// restent épurés par le scrub générique (l'anti-crash outbox touche l'accumulation,
// pas l'op unitaire bornée). Garde-fous : créations sans image, restes de fiche intacts.
import { describe, it, expect } from "vitest";
import { addProduct, updateProduct } from "./db";
import { captureSigned } from "./syncengine/__tests__/setup";
import { onAccount, PRODUCT } from "./tables-sync-helpers";

const PHOTO = "data:image/webp;base64,test";
const photoOf = (p: unknown) => (p as { photo?: string }).photo;

describe("photo produit : propagation P2P", () => {
  it("product.created part SANS la photo (elle reste dans la table products)", async () => {
    await onAccount();
    const product = await addProduct({ ...PRODUCT, photo: PHOTO });
    // La photo est bien en base locale — c'est le seul endroit où elle vit.
    const locale = await (await import("./db")).getDB().products.get(product.id);
    expect(locale?.photo).toBe(PHOTO);

    const created = (await captureSigned()).filter(
      (o) => o.type === "product.created" && o.entity_id === product.id,
    );
    expect(created).toHaveLength(1);
    // L'op de création reste ALLÉGÉE : pas un octet d'image dans le journal.
    expect(photoOf((created[0].payload as { product: unknown }).product)).toBeUndefined();
    // Le reste de la fiche voyage (prix, stock) — seul l'encombrant part.
    expect((created[0].payload as { product: { price: number } }).product.price).toBe(
      (PRODUCT as { price: number }).price,
    );
  });

  it("product.updated part AVEC la photo modifiée (écrase l'ancienne chez le pair)", async () => {
    await onAccount();
    const ANCIENNE = "data:image/png;base64,ancienne";
    const product = await addProduct({ ...PRODUCT, photo: ANCIENNE });

    const nouvelle = "data:image/webp;base64,nouvelle";
    const updated = { ...product, photo: nouvelle };
    await updateProduct(updated);

    const ops = (await captureSigned()).filter(
      (o) => o.type === "product.updated" && o.entity_id === product.id,
    );
    expect(ops).toHaveLength(1);
    const fields = (ops[0].payload as { fields: Record<string, unknown> }).fields;
    // Le champ photo part bien : le pair écrase son ancienne image par celle-ci.
    expect(fields.photo).toBe(nouvelle);
  });
});
