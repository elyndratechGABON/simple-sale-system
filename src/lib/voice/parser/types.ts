import type { Product } from "@/lib/db";

// ---------- Types publics ----------

export interface VoiceMatch {
  product: Product;
  qty: number;
}

export interface ParseResult {
  matches: VoiceMatch[];
  /** Mots dictés qui ne ressemblent à aucun produit du catalogue. */
  unknown: string[];
  command: "clear-last" | "clear-all" | null;
}
