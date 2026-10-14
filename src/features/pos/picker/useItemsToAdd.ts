import { useState } from "react";
import type { Product } from "@/lib/db";

export interface PickerItem {
  id: string;
  /** Absent = ligne libre, saisie sans article : elle n'a pas de stock à sortir. */
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

export function useItemsToAdd(initial: PickerItem[] = []) {
  const [items, setItems] = useState<PickerItem[]>(initial);

  function addProduct(product: Product) {
    if (product.variants?.length) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          cost: product.cost,
        },
      ];
    });
  }

  function increase(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)));
  }

  function decrease(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i)),
    );
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return { items, addProduct, increase, decrease, remove };
}
