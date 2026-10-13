import type { Product } from "@/lib/db";

export const produit = (over: Partial<Product> = {}): Product =>
  ({
    id: "p1",
    name: "Bœuf",
    cost: 2000,
    price: 4000,
    stock: 10,
    category: "Viandes",
    ...over,
  }) as Product;

export const service = (over: Partial<Product> = {}): Product =>
  ({ ...produit(), id: "s1", name: "Coupe", type: "service", stock: 0, ...over }) as Product;
