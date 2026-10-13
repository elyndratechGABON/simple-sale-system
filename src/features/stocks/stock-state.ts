import type { CardStockState } from "@/components/ProductCard";
import type { Product, StockMovement } from "@/lib/db";

/** États de stock partagés avec ProductCard. `service` = prestation ou stock illimité. */
export type StockState = CardStockState;

/** Seuil effectif du produit : son propre seuil, sinon le défaut global (5). */
export function thresholdOf(p: Product): number {
  return typeof p.min_stock === "number" && p.min_stock > 0 ? p.min_stock : 5;
}

/** État de stock d'une fiche. Service ou stock illimité → « service », jamais alarmé. */
export function stateOf(p: Product): StockState {
  if (p.type === "service" || !Number.isFinite(p.stock)) return "service";
  if (p.stock <= 0) return "out";
  if (p.stock <= thresholdOf(p)) return "low";
  return "ok";
}

/** Marge en pourcentage, ou « — » si prix ou coût manquant. */
export function marginLabel(p: Product): string {
  if (!(p.price > 0) || !Number.isFinite(p.price)) return "—";
  if (p.cost <= 0) return "—";
  return `${Math.round(((p.price - p.cost) / p.price) * 100)} %`;
}

export type ChipTone = "default" | "warning" | "danger";
export type StatusFilter = "all" | "service" | "low" | "out";
export type SortKey = "name" | "stock" | "stock_desc" | "price" | "updated" | "bestsellers";

export const REASON_LABEL: Record<StockMovement["reason"], string> = {
  replenishment: "Réapprovisionnement",
  sale: "Vente",
  round: "Commande table",
  cancellation: "Annulation vente",
  correction: "Correction",
  creation: "Création",
};

export const QUICK_QTYS = [1, 5, 10, 50];
