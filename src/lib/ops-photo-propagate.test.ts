// Les photos ne voyagent PLUS dans les opérations (mission anti-crash mémoire) : un
// dataURL pèse 30-80 Ko, et l'outbox qui les accumulait faisait crasher le démarrage
// (3746 ops = 173 Mo). L'image vit DANS la table `products` locale (IndexedDB) ; le
// journal d'ops transporte la fiche SANS elle. Garde-fous : la création ne porte plus
// la photo, la mise à jour non plus — et le reste du payload reste intact.
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
    // L'op transportée est ALLÉGÉE : pas un octet d'image dans le journal.
    expect(photoOf((created[0].payload as { product: unknown }).product)).toBeUndefined();
    // Le reste de la fiche voyage (prix, stock) — seul l'encombrant part.
    expect((created[0].payload as { product: { price: number } }).product.price).toBe(
      (PRODUCT as { price: number }).price,
    );
  });

  it("product.updated part SANS la photo modifiée", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT); // sans photo

    const updated = { ...product, photo: PHOTO };
    await updateProduct(updated);

    const ops = (await captureSigned()).filter(
      (o) => o.type === "product.updated" && o.entity_id === product.id,
    );
    expect(ops).toHaveLength(1);
    const fields = (ops[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields.photo).toBeUndefined();
  });
});
