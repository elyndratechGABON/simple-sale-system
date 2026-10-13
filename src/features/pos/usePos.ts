import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { nextTableLabel, type Target } from "@/lib/pos/types";
import type { Product, Sale } from "@/lib/db";
import type { ParseResult } from "@/lib/voice/parser";
import { savePreferences } from "@/lib/settings";
import { useCart } from "@/lib/pos/use-cart";
import { useSaleMutations } from "@/lib/pos/use-sale-mutations";
import { useTableMutations } from "@/lib/pos/use-table-mutations";
import { usePosData } from "./usePosData";
import { usePosUiState } from "./usePosUiState";
import { usePosDerived } from "./usePosDerived";

export type PosController = ReturnType<typeof usePos>;

/**
 * Orchestrateur de la caisse : assemble l'état d'interface (`usePosUiState`), les données
 * (`usePosData`), les règles du panier (`useCart`), les totaux (`usePosDerived`) et les
 * écritures (vente + cycle des tables). Les sous-composants reçoivent cet objet unique.
 */
export function usePos() {
  const ui = usePosUiState();
  const data = usePosData(ui.target);
  const cart = useCart(data.products);
  const derived = usePosDerived({
    products: data.products,
    isService: data.isService,
    serviceTab: ui.serviceTab,
    filter: ui.filter,
    search: ui.search,
    lines: cart.lines,
    activeTable: data.activeTable,
    rounds: data.rounds,
    cashing: ui.cashing,
    cashGiven: ui.cashGiven,
    payMethod: ui.payMethod,
  });
  const qc = useQueryClient();

  /** Vide la vente entière : le panier (dans le hook) puis tout ce qui décrit QUI on
   *  encaisse et COMMENT — sans sens pour la vente suivante. */
  function resetCart() {
    cart.emptyCart();
    ui.setCashGiven("");
    ui.setCustomers(1);
    ui.setClientName("");
    ui.setClientId(undefined);
    ui.setPayMethod("cash");
    ui.setSheetOpen(false);
  }

  /** Change de destination et remet à zéro tout ce qui n'a de sens que pour la précédente. */
  function selectTarget(next: Target) {
    ui.setTarget(next);
    ui.setCashing(null);
    resetCart();
  }

  const { saleMut, closeDayMut } = useSaleMutations({
    onSold: (sale) => {
      ui.setCheckoutOpen(false);
      resetCart();
      ui.setSaleFlash({
        total: sale.total,
        change: sale.change_due,
        method: sale.payment_method ?? "cash",
      });
    },
    onDayClosed: (n) => {
      ui.setCloseOpen(false);
      toast.success(`${n} vente(s) clôturée(s)`);
    },
  });

  // Le plan de salle vit dans les préférences : ajouter une table est un geste d'affichage,
  // pas une écriture métier — rien n'est ouvert, la carte apparaît simplement.
  function addTable() {
    savePreferences({ tables: [...data.tableLabels, nextTableLabel(data.tableLabels)] });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  const tableMut = useTableMutations({
    onTableOpened: (sale) => selectTarget({ kind: "table", saleId: sale.id }),
    onTableReleased: (saleId) => {
      // Revenir au comptoir UNIQUEMENT si c'était la table libérée : en libérer une
      // autre ne doit pas changer la destination courante sous le doigt du vendeur.
      if (ui.target.kind === "table" && ui.target.saleId === saleId)
        selectTarget({ kind: "direct" });
    },
    onRoundAdded: () => resetCart(),
    onTableSettled: () => selectTarget({ kind: "direct" }),
    onRoundPaid: () => {
      ui.setCashing(null);
      ui.setCashGiven("");
    },
    onTableCancelled: () => {
      ui.setCancelPinOpen(false);
      selectTarget({ kind: "direct" });
    },
  });

  // Le voile de validation s'efface tout seul : le serveur n'a rien à cliquer, la vente
  // suivante peut commencer dès que l'animation a joué.
  const { saleFlash, setSaleFlash } = ui;
  useEffect(() => {
    if (!saleFlash) return;
    const timer = setTimeout(() => setSaleFlash(null), 2000);
    return () => clearTimeout(timer);
  }, [saleFlash, setSaleFlash]);

  function onProductClick(p: Product) {
    if (p.variants && p.variants.length > 0) {
      ui.setVariantPicker({ product: p });
      return;
    }
    cart.addOne(p);
  }

  function applyVoice(result: ParseResult) {
    if (result.command === "clear-all") {
      resetCart();
      toast.success("Panier vidé");
      return;
    }
    if (result.command === "clear-last") {
      const last = cart.lines[cart.lines.length - 1];
      if (last) {
        cart.removeLineByKey(last);
        toast.success(`${last.name} retiré`);
      } else {
        toast.info("Le panier est déjà vide");
      }
      return;
    }
    const added: string[] = [];
    for (const m of result.matches) {
      cart.addQty(m.product, m.qty);
      added.push(
        `${Number.isInteger(m.qty) ? m.qty : m.qty.toLocaleString("fr-FR")} × ${m.product.name}`,
      );
    }
    if (added.length > 0) toast.success(`Ajouté : ${added.join(", ")}`);
    if (result.unknown.length > 0) {
      toast.warning(`Non reconnu : ${result.unknown.join(", ")}`, { duration: 7000 });
    } else if (added.length === 0 && !result.command) {
      toast.info("Rien à ajouter — reformulez la commande");
    }
  }

  function openTablePopup(label: string, sale: Sale | null) {
    ui.setTablePopupTable({ label, sale });
    ui.setTablePopupOpen(true);
  }

  function closeTablePopup() {
    ui.setTablePopupOpen(false);
    ui.setTablePopupTable(null);
  }

  return {
    ...ui,
    ...data,
    ...cart,
    ...derived,
    ...tableMut,
    saleMut,
    closeDayMut,
    addTable,
    selectTarget,
    resetCart,
    onProductClick,
    applyVoice,
    openTablePopup,
    closeTablePopup,
  };
}
