import { describe, it, expect } from "vitest";
import type { Product, ProductVariant } from "./db";
import { normalizeVariantStock } from "./db";
import { buildAlerts } from "./alerts";

const v = (name: string, stock?: number): ProductVariant =>
  stock === undefined ? { id: `v_${name}`, name } : { id: `v_${name}`, name, stock };

const produit = (over: Partial<Product> = {}): Product =>
  ({
    id: "p1",
    name: "Chemise",
    cost: 2000,
    price: 5000,
    stock: 0,
    category: "Boisson",
    deleted_at: undefined,
    updated_at: 1,
    created_at: 1,
    sync_status: "pending",
    ...over,
  }) as Product;

describe("normalizeVariantStock", () => {
  it("fait du stock la somme des variantes", () => {
    const p = normalizeVariantStock(produit({ variants: [v("S", 3), v("M", 0), v("L", 5)] }));
    expect(p.stock).toBe(8);
  });

  it("laisse un produit sans variante intact (stock illimité compris)", () => {
    expect(normalizeVariantStock(produit({ stock: 42 })).stock).toBe(42);
    expect(normalizeVariantStock(produit({ stock: Number.POSITIVE_INFINITY })).stock).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it("ne touche pas au stock physique d'un bien de location", () => {
    // Le bien loué compte ses unités physiques ; une taille épuisée ne réduit pas le
    // parc total disponible à la location.
    // `stock` porte ici le nombre d'unités physiques — c'est le formulaire qui l'écrit,
    // depuis `total_units`. La fonction doit surtout ne PAS le remplacer par une somme.
    const p = normalizeVariantStock(
      produit({ is_asset: true, stock: 4, variants: [v("S", 0), v("M", 1)] }),
    );
    expect(p.stock).toBe(4);
  });

  it("une variante sans stock saisi compte pour zéro", () => {
    expect(normalizeVariantStock(produit({ variants: [v("S", 2), v("M")] })).stock).toBe(2);
  });
});

describe("alertes de stock sur un produit à variantes", () => {
  it("ne crie pas « rupture » quand une seule taille manque", () => {
    const alerts = buildAlerts([produit({ variants: [v("S", 0), v("M", 4)] })], []);
    const rupture = alerts.find((a) => a.id.startsWith("rupture:"));
    expect(rupture?.severity).toBe("warning");
    expect(rupture?.detail).toContain("M");
    expect(rupture?.detail).not.toContain("Rupture de stock");
  });

  it("crie vraiment quand toutes les variantes sont épuisées", () => {
    const alerts = buildAlerts([produit({ variants: [v("S", 0), v("M", 0)] })], []);
    const rupture = alerts.find((a) => a.id.startsWith("rupture:"));
    expect(rupture?.severity).toBe("danger");
    expect(rupture?.detail).toBe("Rupture de stock");
  });

  it("se tait quand le stock total est suffisant", () => {
    const p = normalizeVariantStock(produit({ variants: [v("S", 0), v("M", 40)] }));
    expect(buildAlerts([p], []).some((a) => a.id.startsWith("rupture:"))).toBe(false);
  });

  it("ignore toujours les prestations, même avec des variantes", () => {
    expect(buildAlerts([produit({ type: "service", variants: [v("S", 0)] })], [])).toHaveLength(0);
  });
});
