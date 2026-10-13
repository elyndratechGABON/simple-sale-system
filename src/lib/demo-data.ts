import type { ClusterId } from "./settings";
import { addProduct } from "./db";

type DemoProduct = {
  name: string;
  price: number;
  stock: number;
  category: string;
  type?: "product" | "service";
  unit?: "piece" | "kg" | "liter" | "meter";
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
    cost?: number;
    stock?: number;
    size?: string;
    color?: string;
    pointure?: string;
  }>;
};

const DEMO_DATA: Record<ClusterId, DemoProduct[]> = {
  restaurant: [
    { name: "Poulet braisÃ©", price: 5000, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    { name: "Poisson grillÃ©", price: 4000, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    { name: "Riz sauce arachide", price: 2000, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    {
      name: "Sauce tomate poulet",
      price: 3000,
      stock: Number.POSITIVE_INFINITY,
      category: "Plats",
    },
    { name: "NdolÃ© banane", price: 2500, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    { name: "Regab 33cl", price: 500, stock: 48, category: "Boissons" },
    {
      name: "Jus de gingembre",
      price: 1000,
      stock: Number.POSITIVE_INFINITY,
      category: "Boissons",
    },
    { name: "Eau minÃ©rale", price: 500, stock: 36, category: "Boissons" },
  ],
  bar: [
    { name: "Regab 33cl", price: 500, stock: 48, category: "BiÃ¨res" },
    { name: "Beaufort 33cl", price: 1000, stock: 24, category: "BiÃ¨res" },
    { name: "Tempus 33cl", price: 1000, stock: 24, category: "BiÃ¨res" },
    { name: "Heineken 33cl", price: 1500, stock: 12, category: "BiÃ¨res" },
    { name: "Vin rouge 75cl", price: 5000, stock: 6, category: "Vins" },
    { name: "Pastis 51", price: 3000, stock: 4, category: "Spiritueux" },
    { name: "Whisky Halla", price: 4000, stock: 4, category: "Spiritueux" },
    { name: "Eau minÃ©rale", price: 500, stock: 36, category: "Boissons" },
  ],
  service: [
    {
      name: "Coupe homme",
      price: 2000,
      stock: Number.POSITIVE_INFINITY,
      category: "Coiffure",
      type: "service",
    },
    {
      name: "Coupe femme",
      price: 3000,
      stock: Number.POSITIVE_INFINITY,
      category: "Coiffure",
      type: "service",
    },
    {
      name: "Tresse simple",
      price: 3000,
      stock: Number.POSITIVE_INFINITY,
      category: "Coiffure",
      type: "service",
    },
    {
      name: "Tresse complexe",
      price: 5000,
      stock: Number.POSITIVE_INFINITY,
      category: "Coiffure",
      type: "service",
    },
    {
      name: "DÃ©frisage",
      price: 5000,
      stock: Number.POSITIVE_INFINITY,
      category: "Coiffure",
      type: "service",
    },
    {
      name: "Coloration",
      price: 7000,
      stock: Number.POSITIVE_INFINITY,
      category: "Coiffure",
      type: "service",
    },
    {
      name: "Manucure",
      price: 3000,
      stock: Number.POSITIVE_INFINITY,
      category: "BeautÃ©",
      type: "service",
    },
  ],
  // Cluster PersonnalisÃ© : activitÃ© libre, les dÃ©mos gÃ©nÃ©riques font l'affaire.
  personnalise: [
    { name: "Article exemple A", price: 1000, stock: 20, category: "Divers" },
    { name: "Article exemple B", price: 2500, stock: 12, category: "Divers" },
    { name: "Article exemple C", price: 5000, stock: 8, category: "Divers" },
    {
      name: "Prestation exemple",
      price: 3000,
      stock: Number.POSITIVE_INFINITY,
      category: "Services",
      type: "service",
    },
  ],
};

export async function loadDemoData(cluster: ClusterId): Promise<number> {
  const products = DEMO_DATA[cluster];

  for (const p of products) {
    await addProduct({
      name: p.name,
      price: p.price,
      cost: 0,
      stock: p.stock,
      category: p.category,
      type: p.type,
      unit: p.unit,
      ...(p.variants ? { variants: p.variants } : {}),
    });
  }

  return products.length;
}
