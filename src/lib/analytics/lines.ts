import { startOfDay } from "date-fns";
import type { Category, SaleItem } from "@/lib/db";

export const lineRevenue = (i: SaleItem) => i.price_at_sale * i.quantity;
// cost_at_sale est absent des ventes antérieures au suivi du prix d'acquisition : leur
// bénéfice vaut alors leur chiffre d'affaires.
export const lineProfit = (i: SaleItem) => (i.price_at_sale - (i.cost_at_sale ?? 0)) * i.quantity;
// category_at_sale est absente pour la même raison, et pour les lignes libres d'avant
// l'ajout du champ Catégorie.
export const lineCategory = (i: SaleItem): Category => i.category_at_sale ?? "Autre";

export const dayKey = (ts: number) => startOfDay(ts).getTime();
