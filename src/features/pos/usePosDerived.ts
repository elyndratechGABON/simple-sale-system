import { useMemo } from "react";
import type { Category, PaymentMethod, Product, Sale, SaleItem } from "@/lib/db";
import type { Cashing } from "@/lib/pos/types";

type DerivedInput = {
  products: Product[];
  isService: boolean;
  serviceTab: "prestations" | "produits";
  filter: Category | "Tous";
  search: string;
  lines: { price: number; quantity: number }[];
  activeTable: Sale | null;
  rounds: [number, SaleItem[]][];
  cashing: Cashing;
  cashGiven: string;
  payMethod: PaymentMethod;
};

/** Grille filtrée + totaux d'encaissement, tous purs et recalculés à chaque frappe. */
export function usePosDerived({
  products,
  isService,
  serviceTab,
  filter,
  search,
  lines,
  activeTable,
  rounds,
  cashing,
  cashGiven,
  payMethod,
}: DerivedInput) {
  const filtered = useMemo(() => {
    let list = products;
    // Cluster service : filtrer par type (prestations vs produits)
    if (isService) {
      list = products.filter((p) =>
        serviceTab === "prestations" ? p.type === "service" : p.type !== "service",
      );
    }
    // Filtre par catégorie (tous clusters sauf service)
    if (!isService && filter !== "Tous") {
      list = list.filter((p) => p.category === filter);
    }
    // Recherche par nom : la grille se resserre pendant la frappe, sans toucher aux états.
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, filter, search, isService, serviceTab]);

  // Total du panier
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  // Ce qu'on encaisse : le panier au comptoir, la tournée visée par le panneau ouvert,
  // ou l'addition complète sur une table.
  const cashingRound =
    cashing?.kind === "round" ? rounds.find(([t]) => t === cashing.orderedAt) : undefined;
  const dueNow = activeTable
    ? cashingRound
      ? cashingRound[1].reduce((s, it) => s + it.price_at_sale * it.quantity, 0)
      : activeTable.total
    : total;
  const cash = Number(cashGiven) || 0;
  const dueTotal = activeTable ? dueNow : total;
  const isCash = activeTable !== null || payMethod === "cash";
  const change = isCash ? cash - dueTotal : 0;
  const insufficient = isCash && cash > 0 && change < 0;
  // Comptoir : l'argent se saisit DANS le dialogue d'encaissement — le bouton du panier
  // n'exige que d'avoir quelque chose à vendre.
  const canValidate = activeTable
    ? dueNow > 0 && cash >= dueNow
    : lines.length > 0 && (!isCash || cash >= total);
  const canOpenCheckout = lines.length > 0 && total > 0;

  return {
    filtered,
    total,
    cashingRound,
    dueNow,
    cash,
    dueTotal,
    isCash,
    change,
    insufficient,
    canValidate,
    canOpenCheckout,
  };
}
