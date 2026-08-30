import type { ClusterId, SubCategory } from "./settings";
import { addProduct } from "./db";

type DemoProduct = {
  name: string;
  price: number;
  stock: number;
  category: string;
  type?: "product" | "service";
  unitType?: "unit" | "weight";
  weightUnit?: string;
};

const DEMO_DATA: Record<ClusterId, DemoProduct[]> = {
  retail: [
    { name: "Regab 33cl", price: 500, stock: 48, category: "Boissons" },
    { name: "Sukusa 500g", price: 1500, stock: 20, category: "Alimentation" },
    { name: "Savon Noir", price: 300, stock: 30, category: "Hygiène" },
    { name: "Biscotin", price: 200, stock: 60, category: "Snacks" },
    { name: "Eau minérale 1.5L", price: 500, stock: 36, category: "Boissons" },
    { name: "Bouillon Cube", price: 100, stock: 100, category: "Épicerie" },
    { name: "Pain 1kg", price: 750, stock: 15, category: "Boulangerie" },
    { name: "Lait en poudre 400g", price: 2500, stock: 12, category: "Alimentation" },
  ],
  restaurant: [
    { name: "Poulet braisé", price: 5000, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    { name: "Poisson grillé", price: 4000, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    { name: "Riz sauce arachide", price: 2000, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    {
      name: "Sauce tomate poulet",
      price: 3000,
      stock: Number.POSITIVE_INFINITY,
      category: "Plats",
    },
    { name: "Ndolé banane", price: 2500, stock: Number.POSITIVE_INFINITY, category: "Plats" },
    { name: "Regab 33cl", price: 500, stock: 48, category: "Boissons" },
    {
      name: "Jus de gingembre",
      price: 1000,
      stock: Number.POSITIVE_INFINITY,
      category: "Boissons",
    },
    { name: "Eau minérale", price: 500, stock: 36, category: "Boissons" },
  ],
  bar: [
    { name: "Regab 33cl", price: 500, stock: 48, category: "Bières" },
    { name: "Beaufort 33cl", price: 1000, stock: 24, category: "Bières" },
    { name: "Tempus 33cl", price: 1000, stock: 24, category: "Bières" },
    { name: "Heineken 33cl", price: 1500, stock: 12, category: "Bières" },
    { name: "Vin rouge 75cl", price: 5000, stock: 6, category: "Vins" },
    { name: "Pastis 51", price: 3000, stock: 4, category: "Spiritueux" },
    { name: "Whisky Halla", price: 4000, stock: 4, category: "Spiritueux" },
    { name: "Eau minérale", price: 500, stock: 36, category: "Boissons" },
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
      name: "Défrisage",
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
      category: "Beauté",
      type: "service",
    },
  ],
  clothing: [
    { name: "Pagne wax 6 yards", price: 3000, stock: 20, category: "Pagnes" },
    { name: "Pagne Bazin 6 yards", price: 8000, stock: 10, category: "Pagnes" },
    { name: "T-shirt homme", price: 5000, stock: 15, category: "Homme" },
    { name: "Pantalon jean", price: 10000, stock: 10, category: "Homme" },
    { name: "Robe wax", price: 8000, stock: 8, category: "Femme" },
    { name: "Chaussures femme", price: 12000, stock: 6, category: "Chaussures" },
    { name: "Sac à main", price: 6000, stock: 5, category: "Accessoires" },
  ],
  weight: [
    {
      name: "Viande de bœuf",
      price: 4000,
      stock: 30,
      category: "Viandes",
      unitType: "weight",
      weightUnit: "kg",
    },
    {
      name: "Poulet entier",
      price: 2500,
      stock: 20,
      category: "Volailles",
      unitType: "weight",
      weightUnit: "kg",
    },
    {
      name: "Poisson congelé",
      price: 3000,
      stock: 15,
      category: "Poissons",
      unitType: "weight",
      weightUnit: "kg",
    },
    {
      name: "Crevettes",
      price: 6000,
      stock: 8,
      category: "Fruits de mer",
      unitType: "weight",
      weightUnit: "kg",
    },
    {
      name: "Foie de boeuf",
      price: 2000,
      stock: 10,
      category: "Abats",
      unitType: "weight",
      weightUnit: "kg",
    },
  ],
  magasin: [
    { name: "Téléphone Samsung A14", price: 85000, stock: 5, category: "Téléphones" },
    { name: "Chargeur universel", price: 3000, stock: 20, category: "Accessoires" },
    { name: "Écouteurs Bluetooth", price: 5000, stock: 10, category: "Accessoires" },
    { name: 'Ventilateur 12"', price: 15000, stock: 4, category: "Électroménager" },
    { name: "Fer à repasser", price: 12000, stock: 6, category: "Électroménager" },
    { name: "Marteau", price: 2000, stock: 15, category: "Quincaillerie" },
    { name: "Tournevis", price: 1500, stock: 20, category: "Quincaillerie" },
  ],
  // Cluster Personnalisé : activité libre, les démos génériques font l'affaire.
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
  location: [
    { name: "Chaise en plastique", price: 0, stock: 50, category: "Événementiel" },
    { name: "Tente 6×12m", price: 0, stock: 5, category: "Événementiel" },
    { name: "Table ronde", price: 0, stock: 20, category: "Événementiel" },
    { name: "Sonorisation portable", price: 0, stock: 3, category: "Équipement" },
    { name: "Groupe électrogène 5kVA", price: 0, stock: 2, category: "Équipement" },
    { name: "Voiture berline", price: 0, stock: 2, category: "Véhicules" },
  ],
};

const MAGASIN_DEMO: Record<SubCategory, DemoProduct[]> = {
  electronics: [
    { name: "Téléphone Samsung A14", price: 85000, stock: 5, category: "Téléphones" },
    { name: "Téléphone Tecno Spark", price: 65000, stock: 4, category: "Téléphones" },
    { name: "Chargeur universel", price: 3000, stock: 20, category: "Accessoires" },
    { name: "Écouteurs Bluetooth", price: 5000, stock: 10, category: "Accessoires" },
    { name: "Coque téléphone", price: 1500, stock: 25, category: "Accessoires" },
    { name: "Powerbank 10000mAh", price: 8000, stock: 8, category: "Accessoires" },
  ],
  appliance: [
    { name: "Réfrigérateur TVS 130L", price: 180000, stock: 2, category: "Froid" },
    { name: 'Ventilateur 12"', price: 15000, stock: 4, category: "Ventilation" },
    { name: "Fer à repasser", price: 12000, stock: 6, category: "Repassage" },
    { name: "Mixeur 2L", price: 18000, stock: 3, category: "Cuisine" },
    { name: "Micro-ondes", price: 45000, stock: 2, category: "Cuisine" },
  ],
  furniture: [
    { name: "Chaise en plastique", price: 8000, stock: 20, category: "Salon" },
    { name: "Table basse", price: 35000, stock: 3, category: "Salon" },
    { name: "Bureau ordinateur", price: 60000, stock: 2, category: "Bureau" },
    { name: "Lit 2 places", price: 90000, stock: 2, category: "Chambre" },
    { name: "Armoire 4 portes", price: 120000, stock: 1, category: "Chambre" },
  ],
  hardware_store: [
    { name: "Marteau", price: 2000, stock: 15, category: "Outillage" },
    { name: "Tournevis", price: 1500, stock: 20, category: "Outillage" },
    { name: "Tenailles", price: 3000, stock: 10, category: "Outillage" },
    { name: "Peigne", price: 500, stock: 50, category: "Coiffure" },
    { name: "Fil de fer", price: 1000, stock: 30, category: "Quincaillerie" },
    { name: "Vis assortmenties", price: 200, stock: 100, category: "Quincaillerie" },
  ],
};

export async function loadDemoData(cluster: ClusterId, subCategory?: SubCategory): Promise<number> {
  const products =
    cluster === "magasin" && subCategory ? MAGASIN_DEMO[subCategory] : DEMO_DATA[cluster];

  if (!products) return 0;

  for (const p of products) {
    await addProduct({
      name: p.name,
      price: p.price,
      cost: 0,
      stock: p.stock,
      category: p.category,
      type: p.type,
      unitType: p.unitType,
      weightUnit: p.weightUnit,
    });
  }

  return products.length;
}
