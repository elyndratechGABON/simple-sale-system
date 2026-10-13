import { useState } from "react";
import type { Category, PaymentMethod, Product } from "@/lib/db";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Cashing, Target } from "@/lib/pos/types";

export type CaisseMode = "comptoir" | "tables";

/** Voile « Vente validée » : son + animation, auto-effacé. `null` = caché. */
export type SaleFlash = { total: number; change: number; method: PaymentMethod } | null;

/**
 * Tout l'état d'INTERFACE de la caisse (destination, filtres, dialogues, encaissement).
 * Les données vivent dans `usePosData`, les règles du panier dans `useCart` : ce hook
 * ne fait que retenir ce que l'utilisateur a touché.
 */
export function usePosUiState() {
  const [target, setTarget] = useState<Target>({ kind: "direct" });
  const [freeOpen, setFreeOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>("");
  const [filter, setFilter] = useState<Category | "Tous">("Tous");
  const [search, setSearch] = useState("");
  // Nombre de personnes servies par cette vente. Alimente le KPI « clients » des
  // rapports. Reste à 1 dans le cas courant — un client, une vente.
  const [customers, setCustomers] = useState(1);
  // Nom du client (services : coiffeur, salon, etc.). Optionnel.
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [cashing, setCashing] = useState<Cashing>(null);
  const [cancelPinOpen, setCancelPinOpen] = useState(false);
  // `lg` et non le défaut à 768 : c'est là que la mise en page passe en colonne unique,
  // et ce commutateur change la STRUCTURE (panneau latéral ou feuille), pas juste le style.
  const compact = useIsMobile(1024);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  // Onglet Prestations/Produits (cluster service uniquement)
  const [serviceTab, setServiceTab] = useState<"prestations" | "produits">("prestations");
  // Mode UI : comptoir (défaut) ou tables
  const [mode, setMode] = useState<CaisseMode>("comptoir");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  // Étape d'encaissement ouverte (comptoir uniquement) : le total est figé, on saisit
  // l'argent donné avant de confirmer.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saleFlash, setSaleFlash] = useState<SaleFlash>(null);
  // Saisie manuelle de la quantité (appui long) et sélecteur de variante : deux
  // fenêtres séparées, chacune ne montre que l'essentiel.
  const [manualQtyOpen, setManualQtyOpen] = useState(false);
  const [manualQtyProduct, setManualQtyProduct] = useState<Product | null>(null);
  const [manualQtyValue, setManualQtyValue] = useState<string>("");
  const [variantPicker, setVariantPicker] = useState<{ product: Product } | null>(null);

  return {
    target,
    setTarget,
    freeOpen,
    setFreeOpen,
    cashGiven,
    setCashGiven,
    filter,
    setFilter,
    search,
    setSearch,
    customers,
    setCustomers,
    clientName,
    setClientName,
    clientId,
    setClientId,
    cashing,
    setCashing,
    cancelPinOpen,
    setCancelPinOpen,
    compact,
    sheetOpen,
    setSheetOpen,
    createOpen,
    setCreateOpen,
    closeOpen,
    setCloseOpen,
    ordersOpen,
    setOrdersOpen,
    serviceTab,
    setServiceTab,
    payMethod,
    setPayMethod,
    checkoutOpen,
    setCheckoutOpen,
    saleFlash,
    setSaleFlash,
    manualQtyOpen,
    setManualQtyOpen,
    manualQtyProduct,
    setManualQtyProduct,
    manualQtyValue,
    setManualQtyValue,
    variantPicker,
    setVariantPicker,
    mode,
    setMode,
  };
}
