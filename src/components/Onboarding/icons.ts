import { Beer, Palette, Store, UtensilsCrossed, Wand2 } from "lucide-react";

const ICON_MAP: Record<string, typeof Store> = {
  ChefHat: UtensilsCrossed,
  Coffee: Beer,
  Scissors: Palette,
  Sparkles: Wand2,
};

export function resolveIcon(name: string): typeof Store {
  return ICON_MAP[name] ?? Store;
}
