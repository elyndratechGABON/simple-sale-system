// La photo du produit (DataURL webp réduit) doit traverser le P2P : c'est elle qui
// synchronise instantanément l'image entre le propriétaire et l'employé. Garde-fous :
// la création transporte la fiche ENTIÈRE, la mise à jour ses champs — dont `photo`.
import { describe, it, expect } from "vitest";
import { addProduct, updateProduct } from "./db";
import { captureSigned } from "./syncengine/__tests__/setup";
import { onAccount, PRODUCT } from "./tables-sync-helpers";

const PHOTO = "data:image/webp;base64,test";
const photoOf = (p: unknown) => (p as { photo?: string }).photo;

describe("photo produit : propagation P2P", () => {
  it("product.created transporte la photo", async () => {
    await onAccount();
    const product = await addProduct({ ...PRODUCT, photo: PHOTO });

    const created = (await captureSigned()).filter(
      (o) => o.type === "product.created" && o.entity_id === product.id,
    );
    expect(created).toHaveLength(1);
    expect(photoOf((created[0].payload as { product: unknown }).product)).toBe(PHOTO);
  });

  it("product.updated transporte la photo modifiée", async () => {
    await onAccount();
    const product = await addProduct(PRODUCT); // sans photo

    const updated = { ...product, photo: PHOTO };
    await updateProduct(updated);

    const ops = (await captureSigned()).filter(
      (o) => o.type === "product.updated" && o.entity_id === product.id,
    );
    expect(ops).toHaveLength(1);
    const fields = (ops[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields.photo).toBe(PHOTO);
  });
});
