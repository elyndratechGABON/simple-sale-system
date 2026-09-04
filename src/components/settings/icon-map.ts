import {
  ChefHat,
  Coffee as CupSoda,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Weight,
  Wrench,
} from "lucide-react";

export const ICON_MAP: Record<string, typeof Store> = {
  ShoppingBag,
  ChefHat,
  Coffee: CupSoda,
  Scissors,
  Shirt,
  Weight,
  Wrench,
  Sparkles,
};

export function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}
