import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  X,
  Store,
  Utensils,
  Scissors,
  Package,
  Search,
  Check,
  LayoutGrid,
  CupSoda,
  CakeSlice,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getSaleItems,
  getSaleItemsForSales,
  listOpenTables,
  listProducts,
  listSalesToday,
  type CartLine,
  type Category,
  type PaymentMethod,
  type Product,
  type Sale,
  type SaleItem,
} from "@/lib/db";
import { isWeightProduct, filterQtyInput, parseQty } from "@/lib/pos-quantity";
import { formatFCFA, formatTime } from "@/lib/format";
import { usePreferences } from "@/hooks/use-preferences";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
import { savePreferences } from "@/lib/settings";
import { PinDialog } from "@/components/PinDialog";
import { playSuccessChime } from "@/lib/success-sound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CategorySelect } from "@/components/CategorySelect";
import { ProductForm } from "@/components/ProductForm";
import { POSProductCard } from "@/components/POSProductCard";
import { ClientSelect } from "@/components/ClientSelect";
import { CloseDayDialog } from "@/components/CloseDayDialog";
import { VoiceDictation } from "@/components/VoiceDictation";
import { RentalView } from "@/components/RentalView";
import type { ParseResult } from "@/lib/voice/parser";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { cartKey, nextTableLabel, type Cashing, type Target } from "@/lib/pos/types";
import {
  CartShell,
  CategoryCard,
  CategoryRail,
  FilterChip,
  FreeLineDialog,
  PosLine,
  TableCard,
  TargetChip,
} from "@/components/pos";
import { tableStage } from "@/lib/pos/table-stage";
import { useCart } from "@/lib/pos/use-cart";
import { useSaleMutations } from "@/lib/pos/use-sale-mutations";
import { useTableMutations } from "@/lib/pos/use-table-mutations";
import { useSaleTrigger } from "@/hooks/use-sale-trigger";

export const Route = createFileRoute("/_app/pos")({
  head: () => ({
    meta: [
      { title: "Caisse — Nouvelle commande" },
      {
        name: "description",
        content:
          "Prenez la commande, sélectionnez les articles et calculez la monnaie à rendre au client.",
      },
    ],
  }),
  component: PosPage,
});

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

// Moyens de paiement proposés au comptoir. Les tables restent en espèces : c'est le
// serveur qui encaisse et rend la monnaie, pas un terminal.
const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [{ id: "cash", label: "Espèces" }];

function paymentLabel(m: PaymentMethod): string {
  return PAYMENT_METHODS.find((x) => x.id === m)?.label ?? "Espèces";
}

// Ligne saisie à la main, pour encaisser sans catalogue (stocks pas encore initiés).

function PosPage() {
  const { notifyOwner } = useSaleTrigger();
  const qc = useQueryClient();
  const { tables: tableLabels } = usePreferences();
  const features = useClusterFeatures();
  // Le cycle de service « Préparer / Prêt / Servir » ne concerne que les cuisines :
  // une addition de bar est servie dès qu'elle est versée, sans étape intermédiaire.
  const isOrderPrep = features.workflowType === "order-prep";
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  // Le préfixe ["sales"] est déjà invalidé par toutes les mutations de vente — rien de
  // plus à câbler, cf. src/hooks/use-period-data.ts.
  const { data: openTables = [] } = useQuery({
    queryKey: ["sales", "open"],
    queryFn: listOpenTables,
  });

  // Ventes réglées du jour : alimentent les raccourcis « produits du jour », le mini-historique
  // et le dialogue de clôture de fin de service (déclenché depuis leurs écrans dédiés).
  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales", "today"],
    queryFn: listSalesToday,
    refetchInterval: 10_000, // Auto-refresh toutes les 10s
  });
  const todayTotal = salesToday.reduce((s, x) => s + x.total, 0);

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

  // Le panier : état et gestes. Les RÈGLES (stock, variantes, projections) sont pures et
  // testées dans `lib/pos/cart-ops.ts` ; ce hook n'ajoute que le message et la vibration.
  const {
    cart,
    freeLines,
    lines,
    addEntry,
    addOne,
    addOneByKey,
    removeOne,
    removeLineByKey,
    addQty,
    addFreeLine,
    setLineQty,
    emptyCart,
  } = useCart(products);
  // Le panneau d'encaissement ne s'ouvre qu'à la demande : tant qu'il est fermé, aucun
  // champ « argent donné » ne traîne à l'écran pendant le service, et on ne peut pas
  // confondre « ajouter une tournée » avec « faire payer ». Il vise soit TOUTE la table
  // (fin du service), soit une tournée précise — encaissée au passage, la table reste
  // ouverte pour la suite de la commande.
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
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  // Étape d'encaissement ouverte (comptoir uniquement) : le total est figé, on saisit
  // l'argent donné avant de confirmer.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [rentalPeriod, setRentalPeriod] = useState<"hour" | "day" | "week" | "month" | "year">(
    "day",
  );
  const [returnDate, setReturnDate] = useState<string>("");
  // Voile « Vente validée » : son + animation, auto-effacé. `null` = caché.
  const [saleFlash, setSaleFlash] = useState<{
    total: number;
    change: number;
    method: PaymentMethod;
  } | null>(null);
  // Produit visé depuis la caisse : photo (bouton appareil) ou modification rapide
  // (bouton crayon) — deux fenêtres séparées, chacune ne montre que l'essentiel.
  // Sélecteur de variante : quand un produit a plusieurs variantes, le clic
  // ouvre ce panneau au lieu d'ajouter directement.
  const [manualQtyOpen, setManualQtyOpen] = useState(false);
  const [manualQtyProduct, setManualQtyProduct] = useState<Product | null>(null);
  const [manualQtyValue, setManualQtyValue] = useState<string>("");
  const [variantPicker, setVariantPicker] = useState<{ product: Product } | null>(null);

  // Table DÉRIVÉE de la liste des additions ouvertes, jamais copiée dans l'état local :
  // une table encaissée ou annulée disparaît de la liste, `activeTable` retombe à null et
  // l'écran revient de lui-même au comptoir. Recopier la table dans l'état obligerait à
  // la resynchroniser à la main après chaque mutation, et laisserait une addition fantôme
  // affichée le jour où on l'oublierait.
  const activeTable = useMemo(
    () =>
      target.kind === "table" ? (openTables.find((t) => t.id === target.saleId) ?? null) : null,
    [target, openTables],
  );

  const { data: tableItems = [] } = useQuery({
    queryKey: ["sale_items", activeTable?.id],
    queryFn: () => getSaleItems(activeTable!.id),
    enabled: activeTable !== null,
  });

  const categories = useMemo(() => {
    const s = new Set<Category>();
    products.forEach((p) => s.add(p.category));
    return Array.from(s);
  }, [products]);

  // Lignes de vente du jour, pour la bande « Souvent achetés » : quelques lignes lues en
  // mémoire par vente, jamais plus lourdes que la vue des ventes récentes.
  const { data: todayItems = [] } = useQuery({
    queryKey: ["sale_items", "popular", salesToday.map((s) => s.id).join(",")],
    queryFn: () => getSaleItemsForSales(salesToday.map((s) => s.id)),
    enabled: salesToday.length > 0,
  });

  // Les produits les plus vendus aujourd'hui, triés par quantité décroissante. Les lignes
  // libres (product_id absent) et les produits supprimés (sortis du catalogue) sont écartés.
  const popular = useMemo(() => {
    const qty = new Map<string, number>();
    for (const it of todayItems) {
      if (!it.product_id) continue;
      qty.set(it.product_id, (qty.get(it.product_id) ?? 0) + it.quantity);
    }
    const byProduct = new Map(products.map((p) => [p.id, p]));
    return Array.from(qty.entries())
      .map(([id, q]) => ({ product: byProduct.get(id), amount: q }))
      .filter((x) => x.product)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((x) => x.product as Product);
  }, [todayItems, products]);

  /**
   * Le plan de salle : les tables des Réglages, PLUS toute table ouverte dont le libellé
   * n'y figure plus.
   *
   * Sans cette union, retirer « Terrasse 1 » des Réglages pendant qu'elle est occupée la
   * ferait disparaître de l'écran avec son addition — l'argent resterait dû et personne
   * ne pourrait plus l'encaisser.
   */
  const floorPlan = useMemo(() => {
    const byLabel = new Map(openTables.map((t) => [t.table, t]));
    const labels = [
      ...tableLabels,
      ...openTables.map((t) => t.table!).filter((l) => !tableLabels.includes(l)),
    ];
    return labels.map((label) => ({ label, table: byLabel.get(label) ?? null }));
  }, [tableLabels, openTables]);

  /** Tournées passées de l'addition, groupées par heure de commande, la plus ancienne d'abord. */
  const rounds = useMemo(() => {
    const map = new Map<number, SaleItem[]>();
    for (const item of tableItems) {
      // `ordered_at` est absent des lignes écrites avant les tables : elles forment alors
      // une seule tournée, ce qui est exact — c'était une vente en un passage.
      const key = item.ordered_at ?? 0;
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [tableItems]);

  // Total du panier : si location, multiplie par la période choisie (jour=1, semaine=7, etc.)
  const total = lines.reduce((s, l) => {
    const prod = products.find((p) => p.id === l.product_id);
    const isRental = Boolean(prod?.is_asset);
    const mult = isRental
      ? rentalPeriod === "hour"
        ? 1
        : rentalPeriod === "day"
          ? 1
          : rentalPeriod === "week"
            ? 7
            : rentalPeriod === "month"
              ? 30
              : 365
      : 1;
    return s + l.price * l.quantity * mult;
  }, 0);
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
  // Ce qu'on doit encaisser : le panier au comptoir, la tournée ou l'addition sur une table.
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

  const filtered = useMemo(() => {
    let list = products;
    // Cluster service : filtrer par type (prestations vs produits)
    if (features.isService) {
      list = products.filter((p) =>
        serviceTab === "prestations" ? p.type === "service" : p.type !== "service",
      );
    }
    // Filtre par catégorie (tous clusters sauf service)
    if (!features.isService && filter !== "Tous") {
      list = list.filter((p) => p.category === filter);
    }
    // Recherche par nom : la grille se resserre pendant la frappe, sans toucher aux états.
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, filter, search, features.isService, serviceTab]);

  /** Change de destination et remet à zéro tout ce qui n'a de sens que pour la précédente. */
  function selectTarget(next: Target) {
    setTarget(next);
    setCashing(null);
    resetCart();
  }

  // Écritures : la vente d'un côté, le cycle des tables de l'autre. Elles ne partagent
  // aucun état, mais toutes deux chargent ce qu'elles ont besoin en paramètre et rendent
  // la main par callback — aucune ne lit le panier par capture, sinon il y aurait deux
  // chemins vers le même état.
  const { saleMut, closeDayMut } = useSaleMutations({
    onSold: (sale) => {
      setCheckoutOpen(false);
      resetCart();
      setSaleFlash({
        total: sale.total,
        change: sale.change_due,
        method: sale.payment_method ?? "cash",
      });
    },
    onDayClosed: (n) => {
      setCloseOpen(false);
      toast.success(`${n} vente(s) clôturée(s)`);
    },
  });

  // Le plan de salle vit dans les préférences : ajouter une table est un geste d'affichage,
  // pas une écriture métier — rien n'est ouvert, la carte apparaît simplement.
  function addTable() {
    savePreferences({ tables: [...tableLabels, nextTableLabel(tableLabels)] });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  const {
    openMut,
    closeMut,
    serveMut,
    prepareMut,
    readyMut,
    roundMut,
    payMut,
    payRoundMut,
    cancelTableMut,
  } = useTableMutations({
    onTableOpened: (sale) => selectTarget({ kind: "table", saleId: sale.id }),
    onTableReleased: (saleId) => {
      // Revenir au comptoir UNIQUEMENT si c'était la table libérée : en libérer une
      // autre ne doit pas changer la destination courante sous le doigt du vendeur.
      if (target.kind === "table" && target.saleId === saleId) selectTarget({ kind: "direct" });
    },
    onRoundAdded: () => resetCart(),
    onTableSettled: () => selectTarget({ kind: "direct" }),
    onRoundPaid: () => {
      setCashing(null);
      setCashGiven("");
    },
    onTableCancelled: () => {
      setCancelPinOpen(false);
      selectTarget({ kind: "direct" });
    },
  });

  // Le voile de validation s'efface tout seul : le serveur n'a rien à cliquer, la vente
  // suivante peut commencer dès que l'animation a joué.
  useEffect(() => {
    if (!saleFlash) return;
    const timer = setTimeout(() => setSaleFlash(null), 2000);
    return () => clearTimeout(timer);
  }, [saleFlash]);

  /** Vide la vente entière : le panier (dans le hook) puis tout ce qui décrit QUI on
   *  encaisse et COMMENT — sans sens pour la vente suivante. */
  function resetCart() {
    emptyCart();
    setCashGiven("");
    setCustomers(1);
    setClientName("");
    setClientId(undefined);
    setPayMethod("cash");
    setSheetOpen(false);
  }

  function onProductClick(p: Product) {
    if (p.variants && p.variants.length > 0) {
      setVariantPicker({ product: p });
      return;
    }
    addOne(p);
  }

  function applyVoice(result: ParseResult) {
    if (result.command === "clear-all") {
      resetCart();
      toast.success("Panier vidé");
      return;
    }
    if (result.command === "clear-last") {
      const last = lines[lines.length - 1];
      if (last) {
        removeLineByKey(last);
        toast.success(`${last.name} retiré`);
      } else {
        toast.info("Le panier est déjà vide");
      }
      return;
    }
    const added: string[] = [];
    for (const m of result.matches) {
      addQty(m.product, m.qty);
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

  // La page ouvre directement sur la grille et le panier. Un écran d'attente précédait
  // chaque vente (« Nouvelle commande ») : un geste de plus sur l'action la plus répétée
  // de la journée, pour un écran qui n'apprenait rien. L'état vide de la grille suffit.
  return (
    // `pb-20` dès qu'il y a quelque chose à encaisser : la barre de résumé est en `fixed`
    // et ne pousse rien, elle recouvrirait sinon le dernier produit de la grille.
    <div
      className={cn(
        "app-container space-y-4 py-4",
        compact && (activeTable !== null || lines.length > 0) && "pb-20",
      )}
    >
      {/* Plan de salle. Toutes les tables sont là, occupées ou non, TOUJOURS à la même
          place : c'est ce qui permet de lire l'état du service d'un coup d'œil au lieu de
          chercher un nom dans une liste qui bouge. Un tap sur une table libre l'ouvre
          directement, un appui long sur une table occupée la libère.
          Masqué pour un commerce sans système de tables (snack/bar) : la caisse se réduit
          alors au comptoir et à l'encaissement immédiat. */}
      {features.hasTables && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
            {floorPlan.map(({ label, table }) => (
              <TableCard
                key={label}
                label={label}
                table={table}
                active={activeTable?.table === label}
                disabled={openMut.isPending || closeMut.isPending}
                showServiceCycle={isOrderPrep}
                onPrepare={table ? () => prepareMut.mutate(table.id) : undefined}
                onReady={table ? () => readyMut.mutate(table.id) : undefined}
                onServe={table ? () => serveMut.mutate(table.id) : undefined}
                onClick={() =>
                  table ? selectTarget({ kind: "table", saleId: table.id }) : openMut.mutate(label)
                }
                onLongPress={table ? () => closeMut.mutate(table.id) : undefined}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TargetChip
              active={activeTable === null}
              onClick={() => selectTarget({ kind: "direct" })}
              icon={Store}
              label="Comptoir"
            />
            <Button variant="outline" className="h-11" onClick={addTable}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle table
            </Button>
          </div>
          {/* Légende du code couleur des étapes : toujours affichée, elle est ce qui rend
              la lecture d'un coup d'œil possible pour un serveur qui ne connaît pas encore
              le code. Le restaurant distingue les crans du service ; les autres métiers à
              tables n'en ont que trois (libre, en cours, payée). */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border" />
              Libre
            </span>
            {isOrderPrep ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />À préparer
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  En préparation
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Prête
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Servie
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  En cours
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Servi
                </span>
              </>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Payé
            </span>
          </div>
          {/* Le geste est invisible sans ce rappel, et il n'existe qu'une fois qu'une table
              est occupée : afficher la phrase en permanence apprendrait un geste inutile. */}
          {openTables.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Appui long sur une table occupée pour la libérer.
            </p>
          )}
          {/* Bouton "Commandes en cours" — accès rapide au panneau latéral */}
          {openTables.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setOrdersOpen(true)}
            >
              <Utensils className="h-4 w-4" />
              Commandes en cours
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {openTables.length}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Largeurs par palier (§21, §22) :
          - ≥1024 : produits ~70 %, panier 30 % (360 px) — la tablette a peu de place,
            un panier de 400 px y mange un tiers de l'écran.
          - ≥1280 : 3 colonnes Catégories | Produits | Panier (20 / 52 / 28).
          - ≥1536 : la grille de produits gagne de la place, le panier ne grossit pas
            au-delà de 360 px — un panier trop large n'aide pas à lire des lignes.
          `minmax(0,1fr)` sur le centre empêche la grille de déborder quand une carte
          porte un nom long. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(320px,28%)] 2xl:grid-cols-[minmax(210px,18%)_minmax(0,1fr)_minmax(360px,26%)]">
        {/* Colonne 1/3 — CATÉGORIES. Masquée sous 1280 px, où la grille de cartes
            prend sa place dans la colonne produits : à cette largeur, une colonne de
            200 px volerait trop de place aux produits.
            `sticky` + `max-h` + défilement interne : la colonne suit le défilement de la
            page et la liste reste lisible sans faire défiler toute la fenêtre. */}
        <aside className="hidden xl:block">
          {!features.isService && categories.length > 0 && (
            <section className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Catégories
              </p>
              <div className="space-y-1">
                <CategoryRail
                  label="Tous"
                  active={filter === "Tous"}
                  onClick={() => setFilter("Tous")}
                />
                {categories.map((c) => (
                  <CategoryRail
                    key={c}
                    label={c}
                    active={filter === c}
                    onClick={() => setFilter(c)}
                  />
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Products */}
        <div className="flex min-w-0 flex-col">
          {/* Titre seul sur sa ligne en mobile ; les catégories passent dans
              leur propre rangée scrollable (chip-row) au lieu de pousser le
              titre ou de s'empiler en salade de puces. */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold sm:text-xl">
              {features.isService
                ? serviceTab === "prestations"
                  ? "Prestations"
                  : "Produits"
                : "Articles"}
            </h2>
            {features.isService && (
              <div className="flex gap-1">
                <FilterChip
                  active={serviceTab === "prestations"}
                  onClick={() => setServiceTab("prestations")}
                >
                  <Scissors className="h-3.5 w-3.5 mr-1" /> Prestations
                </FilterChip>
                <FilterChip
                  active={serviceTab === "produits"}
                  onClick={() => setServiceTab("produits")}
                >
                  <Package className="h-3.5 w-3.5 mr-1" /> Produits
                </FilterChip>
              </div>
            )}
          </div>
          {/* Recherche : la grille se resserre pendant la frappe (même recette que
              Stocks). Le clavier remonte déjà le dock via `--kb-h` — rien à câbler. */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article…"
              aria-label="Rechercher un article"
              className="h-12 rounded-xl pl-9"
            />
          </div>
          {/* Catégories : grille de cartes sous 1280 px. Au-dessus, elles vivent dans la
              colonne de gauche (xl:block) — sinon ce sont deux fois les mêmes boutons à
              l'écran. Mêmes `filter`, mêmes catégories, mêmes handlers : visuel seul. */}
          {!features.isService && categories.length > 0 && (
            <section className="mt-4 xl:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Catégories
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 xs:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 xl:gap-3">
                <CategoryCard
                  label="Tous"
                  active={filter === "Tous"}
                  onClick={() => setFilter("Tous")}
                />
                {categories.map((c) => (
                  <CategoryCard
                    key={c}
                    label={c}
                    active={filter === c}
                    onClick={() => setFilter(c)}
                  />
                ))}
              </div>
            </section>
          )}
          {/* Les produits du jour, en un tap : le serveur re-commande sans chercher dans
              la grille. Masquée dès qu'on cherche ou qu'on filtre — sinon la bande
              contredirait la sélection courante. Cluster service : respecte l'onglet
              Prestations/Produits. */}
          {search.trim() === "" && filter === "Tous" && popular.length > 0 && (
            <div className="chip-row bleed-x mt-5 py-1">
              {popular
                .filter((p) =>
                  features.isService
                    ? serviceTab === "prestations"
                      ? p.type === "service"
                      : p.type !== "service"
                    : true,
                )
                .map((p) => {
                  const out = Number.isFinite(p.stock) && p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => onProductClick(p)}
                      className={cn(
                        "flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-card pl-1.5 pr-3 text-sm shadow-sm",
                        "hover:border-primary active:scale-[0.98]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        out && "opacity-50",
                      )}
                    >
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <span className="font-medium whitespace-nowrap">{p.name}</span>
                      <span className="font-bold whitespace-nowrap text-primary tabular-nums">
                        {formatFCFA(p.price)}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
          <div
            className={cn(
              "mt-5 grid gap-2.5 xs:gap-3",
              // Sous 1280, la grille occupe toute la largeur (mode tables ou non) comme
              // avant. Au-dessus, elle vit dans la colonne centrale entre Catégories et
              // Panier — donc elle perd une colonne de largeur réelle, et il faut la
              // décompter sinon les cartes tombent sous 150 px.
              features.hasTables
                ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
            )}
          >
            {filtered.map((p) => {
              const inCart = Object.entries(cart)
                .filter(([k]) => k === p.id || k.startsWith(`${p.id}::`))
                .reduce((s, [, e]) => s + e.qty, 0);
              return (
                <POSProductCard
                  key={p.id}
                  product={p}
                  inCart={inCart}
                  onAdd={onProductClick}
                  // Appui long = saisie manuelle de la quantité. C'est le seul geste de
                  // « gestion » que la caisse garde : ouvrir une fiche pour corriger une
                  // quantité ferait perdre la vente, et 20 c'est un cas réel en Weight.
                  onLongPress={(prod: Product) => {
                    setManualQtyProduct(prod);
                    setManualQtyValue(String(cart[p.id]?.qty ?? 1));
                    setManualQtyOpen(true);
                  }}
                />
              );
            })}
          </div>
          {products.length > 0 && filtered.length === 0 && (
            <p className="mt-3 py-10 text-center text-sm text-muted-foreground">
              Aucun article ne correspond à la recherche.
            </p>
          )}
          {products.length === 0 && (
            // Catalogue vide : c'est le tout premier lancement, et la main est déjà ici.
            // Créer le premier produit sans quitter la caisse évite au nouveau commerçant
            // de chercher l'écran Stocks au moment où il n'a encore rien à vendre.
            <Card className="mt-3">
              <CardContent className="space-y-3 p-8 text-center">
                <p className="font-semibold">Votre catalogue est vide.</p>
                <p className="text-sm text-muted-foreground">
                  Créez votre premier produit pour commencer à vendre.
                </p>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg">
                      <Plus className="h-5 w-5 mr-1" /> Créer un produit
                    </Button>
                  </DialogTrigger>
                  <ProductForm
                    editing={null}
                    onClose={() => setCreateOpen(false)}
                    defaultCategory={features.isService ? "Service" : undefined}
                    defaultType={features.isService ? "service" : undefined}
                  />
                </Dialog>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez aussi utiliser « Article manuel » dans le panier pour encaisser sans
                  catalogue, ou gérer vos produits dans{" "}
                  <Link to="/stocks" className="text-primary underline">
                    Stocks
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          )}{" "}
        </div>
        {/* Panier / encaissement. Panneau latéral collant sur grand écran, feuille
            coulissante sur téléphone — cf. CartShell. */}
        <CartShell compact={compact} open={sheetOpen} onOpenChange={setSheetOpen}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {activeTable ? (
                <>
                  <Utensils className="h-5 w-5" /> Table {activeTable.table}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" /> Panier
                </>
              )}
            </h2>
            {activeTable ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setCancelPinOpen(true)}
              >
                <X className="h-4 w-4 mr-1" /> Annuler la table
              </Button>
            ) : (
              // « Vider » et non « Annuler » : il n'y a plus d'écran d'attente à quitter,
              // ce bouton ne fait que remettre le panier à zéro.
              <Button size="sm" variant="ghost" onClick={resetCart} disabled={lines.length === 0}>
                <X className="h-4 w-4 mr-1" /> Vider
              </Button>
            )}
          </div>

          {/* L'addition déjà servie, tournée par tournée. C'est ce que la table doit
              pouvoir vérifier avant de payer. Chaque tournée s'encaisse indépendamment :
              le geste « Encaisser cette tournée » la règle sans clore la table, qui reste
              disponible pour la suite de la commande. */}
          {activeTable && rounds.length > 0 && (
            <div className="space-y-2">
              <div className="max-h-56 space-y-3 overflow-auto rounded-lg border bg-muted/40 p-3">
                {rounds.map(([orderedAt, items]) => {
                  const roundTotal = items.reduce((s, it) => s + it.price_at_sale * it.quantity, 0);
                  return (
                    <div key={orderedAt} className="rounded-lg border bg-card p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {orderedAt ? formatTime(orderedAt) : "Commande"}
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                          {formatFCFA(roundTotal)}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {items.map((it) => (
                          <div key={it.id} className="flex justify-between gap-2 text-sm">
                            <span className="truncate">
                              {it.quantity} × {it.name}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatFCFA(it.price_at_sale * it.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Masqué pendant l'encaissement : à ce moment-là on ne change plus
                          de cible, on compte l'argent de celle déjà choisie. */}
                      {!cashing && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full gap-1"
                          onClick={() => setCashing({ kind: "round", orderedAt })}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Encaisser cette tournée
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-semibold">Addition</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {formatFCFA(activeTable.total)}
                </span>
              </div>
            </div>
          )}

          {activeTable && rounds.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Table ouverte, rien de servi pour l'instant.
            </p>
          )}

          {/* Saisie de la tournée. Masquée pendant l'encaissement : à ce moment-là on ne
              commande plus, on compte l'argent. */}
          {!cashing && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setFreeOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Article manuel
                </Button>
                <VoiceDictation products={products} onResult={applyVoice} />
              </div>

              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {activeTable
                    ? "Touchez des articles pour composer la prochaine tournée."
                    : "Ajoutez des articles depuis la grille ou saisissez-les à la main."}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {/* `layout` fait glisser les lignes restantes quand on en supprime une au
                  milieu du panier, au lieu de les faire sauter. `popLayout` évite que la
                  ligne en cours de sortie décale les autres pendant son animation. */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {lines.map((l) => (
                      <PosLine
                        key={l.key}
                        line={l}
                        isService={features.isService}
                        onRemoveOne={removeOne}
                        onAddOne={addOneByKey}
                        onRemove={removeLineByKey}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-lg font-semibold">{activeTable ? "Tournée" : "Total"}</span>
                <span className="text-3xl font-bold text-primary tabular-nums">
                  {formatFCFA(dueTotal)}
                </span>
              </div>

              {/* Discret à dessein : le cas courant est « 1 client » et ne doit demander
                  aucun geste. Absent sur une table : le service n'a pas à compter les
                  personnes assises pour prendre une commande, la table compte pour un. */}
              {!activeTable && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Clients servis</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 sm:h-9 sm:w-9"
                      aria-label="Un client de moins"
                      disabled={customers <= 1}
                      onClick={() => setCustomers((c) => Math.max(1, c - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-semibold">{customers}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 sm:h-9 sm:w-9"
                      aria-label="Un client de plus"
                      onClick={() => setCustomers((c) => c + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Encaissement SUR TABLE uniquement : il n'apparaît qu'après avoir choisi sa
              cible — « Encaisser » pour toute l'addition, « Encaisser cette tournée » pour
              une seule. Au comptoir, l'argent se saisit dans le dialogue d'encaissement,
              ouvert par « Valider » — le panier reste un récapitulatif pendant la prise. */}
          {activeTable && cashing && (
            <>
              {cashing.kind === "round" && cashingRound && (
                <p className="text-sm font-medium text-muted-foreground">
                  Tournée de {formatTime(cashingRound[0])} — {formatFCFA(dueNow)} à encaisser
                </p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="cash-given">
                  Argent donné
                </label>
                <Input
                  id="cash-given"
                  inputMode="numeric"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="h-14 text-2xl text-right font-bold tabular-nums"
                />
                <div className="flex flex-wrap gap-1">
                  {QUICK_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      variant="secondary"
                      size="sm"
                      onClick={() => setCashGiven(String((Number(cashGiven) || 0) + amt))}
                    >
                      +{formatFCFA(amt)}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setCashGiven("")}>
                    Vider
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg p-4 flex items-center justify-between",
                  insufficient ? "bg-destructive/10" : "bg-accent",
                )}
              >
                <span className="font-semibold">
                  {insufficient ? "Manque" : "Monnaie à rendre"}
                </span>
                <span
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    insufficient ? "text-destructive" : "text-primary",
                  )}
                >
                  {formatFCFA(Math.abs(change))}
                </span>
              </div>
              {insufficient && (
                <p className="text-sm text-destructive">
                  Montant insuffisant. Demander au moins {formatFCFA(dueTotal)}.
                </p>
              )}
            </>
          )}

          {/* Action principale. Son libellé dit exactement ce qui va se passer : ajouter
              une tournée n'engage pas d'argent, encaisser clôt l'addition. */}
          {!activeTable ? (
            <>
              {features.isService && lines.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="client-name">
                    Nom du client
                  </label>
                  <ClientSelect
                    value={clientName}
                    onChange={(name, id) => {
                      setClientName(name);
                      setClientId(id);
                    }}
                  />
                </div>
              )}
              <Button
                size="lg"
                className="w-full h-16 text-lg gap-2"
                disabled={!canOpenCheckout}
                onClick={() => setCheckoutOpen(true)}
              >
                <CheckCircle2 className="h-5 w-5" />
                Valider la vente
              </Button>
            </>
          ) : cashing ? (
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full h-16 text-lg gap-2"
                disabled={!canValidate || payMut.isPending || payRoundMut.isPending}
                onClick={() =>
                  cashing.kind === "round"
                    ? payRoundMut.mutate({
                        saleId: activeTable.id,
                        orderedAt: cashing.orderedAt,
                        cash,
                      })
                    : payMut.mutate({ saleId: activeTable.id, cash })
                }
              >
                <CheckCircle2 className="h-5 w-5" />
                {cashing.kind === "round"
                  ? "Valider l'encaissement de la tournée"
                  : "Valider l'encaissement"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCashing(null);
                  setCashGiven("");
                }}
              >
                Retour à la commande
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full h-16 text-lg gap-2"
                disabled={lines.length === 0 || roundMut.isPending}
                onClick={() =>
                  roundMut.mutate({
                    saleId: activeTable.id,
                    lines: lines.map(({ key: _key, ...line }): CartLine => line),
                  })
                }
              >
                <Plus className="h-5 w-5" />
                Prendre la commande
              </Button>
              {/* « Servir » n'apparaît que si la table n'est pas encore marquée servie.
                  C'est le verrou : tant que le plat n'a pas quitté la cuisine, le
                  paiement reste bloqué. */}
              {!activeTable.served_at && activeTable.total > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 gap-2 border-orange-400 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-400/50 dark:hover:bg-orange-950/30"
                  disabled={serveMut.isPending}
                  onClick={() => serveMut.mutate(activeTable.id)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Servir la commande
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 gap-2"
                disabled={!activeTable.served_at || activeTable.total <= 0}
                onClick={() => setCashing({ kind: "table" })}
              >
                <CheckCircle2 className="h-4 w-4" />
                Payer {formatFCFA(activeTable.total)}
              </Button>
            </div>
          )}
        </CartShell>
      </div>

      {/* Barre de résumé, téléphone uniquement. Le total et l'action principale restent
          sous le pouce en permanence : sans elle, sur un écran de 844 px, « Valider la
          vente » tombait à 1024 px — hors champ, sur le geste le plus répété du service. */}
      {compact && (activeTable !== null || lines.length > 0) && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          // Posée AU-DESSUS de la barre d'onglets, pas par-dessus : `--bottomnav-h`
          // est la hauteur des onglets (src/components/Nav.tsx) et
          // `env(safe-area-inset-bottom)` la marge que cette barre s'ajoute.
          // `--kb-h` remonte la barre au-dessus du clavier quand il ouvre (le
          // layout viewport ne rétrécit pas, sans ça elle serait couverte).
          className="fixed inset-x-0 bottom-[calc(var(--bottomnav-h)+var(--kb-h,0px)+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 border-t bg-primary px-4 py-2.5 text-primary-foreground shadow-lg"
        >
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="truncate text-xs opacity-90">
              {activeTable ? `Table ${activeTable.table}` : "Comptoir"}
              {lines.length > 0 ? ` · ${lines.length} article${lines.length > 1 ? "s" : ""}` : ""}
            </span>
            <span className="text-xl font-bold tabular-nums">
              {formatFCFA(activeTable ? activeTable.total : total)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 font-semibold">
            <ShoppingCart className="h-4 w-4" />
            {activeTable && lines.length === 0 ? "Encaisser" : "Ouvrir"}
          </span>
        </button>
      )}

      <FreeLineDialog open={freeOpen} onOpenChange={setFreeOpen} onAdd={addFreeLine} />

      {/* ── Sélecteur de variante ──────────────────────────────────────── */}
      <Dialog open={variantPicker !== null} onOpenChange={() => setVariantPicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{variantPicker?.product.name} — choisir une variante</DialogTitle>
          </DialogHeader>
          {variantPicker && (
            <div className="grid gap-2">
              {(variantPicker.product.variants ?? []).map((v) => {
                const cur = cart[cartKey(variantPicker.product, v.id)]?.qty ?? 0;
                const stockOk = !Number.isFinite(v.stock) || cur < (v.stock ?? 0);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!stockOk}
                    onClick={() => {
                      addEntry(variantPicker.product, v.id, 1);
                      setVariantPicker(null);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-left",
                      "hover:border-primary active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !stockOk && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span>
                      {v.name}
                      {v.size ? ` · ${v.size}` : ""}
                      {v.color ? ` · ${v.color}` : ""}
                      {v.pointure ? ` · ${v.pointure}` : ""}
                    </span>
                    <span className="ml-2 flex shrink-0 items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatFCFA(v.price ?? variantPicker.product.price ?? 0)}
                      </span>
                      {Number.isFinite(v.stock) && (
                        <span className="text-xs opacity-60">
                          {(v.stock ?? 0) - cur} restant{(v.stock ?? 0) - cur !== 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CloseDayDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        salesCount={salesToday.length}
        total={todayTotal}
        busy={closeDayMut.isPending}
        onConfirm={() => closeDayMut.mutate()}
      />

      {/* ── Panneau "Commandes en cours" ─────────────────────────────────── */}
      <Drawer open={ordersOpen} onOpenChange={setOrdersOpen}>
        <DrawerContent>
          <DrawerTitle className="px-4 pt-2">Commandes en cours</DrawerTitle>
          <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
            {openTables.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune commande en cours.
              </p>
            ) : (
              <div className="space-y-2 pt-2">
                {openTables
                  .slice()
                  .sort((a, b) => {
                    // Les plus urgents d'abord : à préparer, puis en préparation,
                    // prête, servie, et enfin réglée.
                    const order: Record<string, number> = {
                      "to-prepare": 0,
                      preparing: 1,
                      ready: 2,
                      served: 3,
                      paid: 4,
                    };
                    const sa = order[tableStage(a)] ?? 5;
                    const sb = order[tableStage(b)] ?? 5;
                    return sa - sb || (a.opened_at ?? 0) - (b.opened_at ?? 0);
                  })
                  .map((t) => {
                    const stage = tableStage(t);
                    // Cluster location : vue dédiée locations d'actifs (pas de panier)
                    if (features.isLocation) {
                      return (
                        <div className="app-container space-y-4 py-4">
                          <RentalView />
                          <CloseDayDialog
                            open={closeOpen}
                            onOpenChange={setCloseOpen}
                            salesCount={salesToday.length}
                            total={todayTotal}
                            busy={closeDayMut.isPending}
                            onConfirm={() => closeDayMut.mutate()}
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border p-3",
                          stage === "to-prepare" &&
                            "border-orange-400/40 bg-orange-50/50 dark:border-orange-400/40 dark:bg-orange-950/10",
                          stage === "preparing" && "border-warning/40 bg-warning/5",
                          stage === "ready" &&
                            "border-green-500/40 bg-green-50/50 dark:bg-green-950/10",
                          stage === "served" && "border-primary/30 bg-accent/50",
                          stage === "paid" && "border-primary/30 bg-accent/50",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Table {t.table}</span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                stage === "to-prepare" &&
                                  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                                stage === "preparing" && "bg-warning/20 text-warning-foreground",
                                stage === "ready" &&
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                (stage === "served" || stage === "paid") &&
                                  "bg-primary/10 text-primary",
                              )}
                            >
                              {stage === "to-prepare"
                                ? "à préparer"
                                : stage === "preparing"
                                  ? "en préparation"
                                  : stage === "ready"
                                    ? "prête"
                                    : stage === "served"
                                      ? "servie"
                                      : "payée"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatFCFA(t.total)} · {t.opened_at ? formatTime(t.opened_at) : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setOrdersOpen(false);
                              selectTarget({ kind: "table", saleId: t.id });
                            }}
                          >
                            Ouvrir
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <PinDialog
        open={cancelPinOpen}
        onOpenChange={setCancelPinOpen}
        description={`Toute l'addition de la table ${activeTable?.table ?? ""} est supprimée et le stock des articles servis est restauré.`}
        onConfirm={() => {
          if (activeTable) cancelTableMut.mutate(activeTable.id);
        }}
      />

      {/* Étape d'encaissement du comptoir : le total est figé en haut, on saisit l'argent
          reçu, la monnaie se calcule en direct. C'est ICI et pas avant que l'argent
          entre en jeu — pendant la prise de commande, le panier reste un récapitulatif. */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encaissement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-accent p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total à payer</p>
              <p className="text-4xl font-bold text-primary tabular-nums">{formatFCFA(total)}</p>
            </div>

            {/* Sélecteur de période pour location d'actifs */}
            {lines.some((l) => {
              const prod = products.find((p) => p.id === l.product_id);
              return prod?.is_asset;
            }) && (
              <div className="rounded-lg border p-3 space-y-3 bg-card">
                <div>
                  <Label className="text-sm font-medium">Durée de location</Label>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                    {(
                      [
                        { key: "hour" as const, label: "Heure" },
                        { key: "day" as const, label: "Jour" },
                        { key: "week" as const, label: "Semaine" },
                        { key: "month" as const, label: "Mois" },
                        { key: "year" as const, label: "Année" },
                      ] as const
                    ).map((opt) => (
                      <Button
                        key={opt.key}
                        type="button"
                        size="sm"
                        variant={rentalPeriod === opt.key ? "default" : "outline"}
                        onClick={() => setRentalPeriod(opt.key)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="checkout-return" className="text-xs text-muted-foreground">
                    Date de reprise
                  </Label>
                  <Input
                    id="checkout-return"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Période :{" "}
                  <span className="font-semibold text-foreground">
                    {rentalPeriod === "hour"
                      ? "par heure"
                      : rentalPeriod === "day"
                        ? "par jour"
                        : rentalPeriod === "week"
                          ? "par semaine"
                          : rentalPeriod === "month"
                            ? "par mois"
                            : "par an"}
                  </span>
                </p>
              </div>
            )}

            {/* Empilés sur petit écran : « Mobile Money » en 3 colonnes de
                ~74px débordait de sa cellule ; côte à côte dès que la modale
                a la place. */}
            <div className="grid grid-cols-1 gap-1 min-[400px]:grid-cols-3">
              {PAYMENT_METHODS.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={payMethod === m.id ? "default" : "outline"}
                  onClick={() => setPayMethod(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {payMethod === "cash" ? (
              <>
                <label className="text-sm font-medium" htmlFor="checkout-cash">
                  Argent donné
                </label>
                <Input
                  id="checkout-cash"
                  autoFocus
                  inputMode="numeric"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="h-16 text-center text-3xl font-bold tabular-nums"
                />
                <div className="flex flex-wrap gap-1">
                  {QUICK_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      variant="secondary"
                      size="sm"
                      onClick={() => setCashGiven(String((Number(cashGiven) || 0) + amt))}
                    >
                      +{formatFCFA(amt)}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setCashGiven("")}>
                    Vider
                  </Button>
                </div>

                <div
                  className={cn(
                    "rounded-lg p-4 flex items-center justify-between",
                    insufficient ? "bg-destructive/10" : "bg-accent",
                  )}
                >
                  <span className="font-semibold">
                    {insufficient ? "Manque" : "Monnaie à rendre"}
                  </span>
                  <span
                    className={cn(
                      "text-3xl font-bold tabular-nums",
                      insufficient ? "text-destructive" : "text-primary",
                    )}
                  >
                    {formatFCFA(Math.abs(change))}
                  </span>
                </div>
                {insufficient && (
                  <p className="text-sm text-destructive">
                    Montant insuffisant. Demander au moins {formatFCFA(dueTotal)}.
                  </p>
                )}
              </>
            ) : (
              // Hors espèces, le débit est exact — pas d'argent physique, pas de monnaie.
              <div className="rounded-lg p-4 flex items-center justify-between bg-accent">
                <span className="font-semibold">Débité exactement</span>
                <span className="text-3xl font-bold text-primary tabular-nums">
                  {formatFCFA(total)}
                </span>
              </div>
            )}

            {manualQtyOpen && manualQtyProduct && (
              <Dialog open={manualQtyOpen} onOpenChange={setManualQtyOpen}>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Quantité — {manualQtyProduct.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label>Nombre</Label>
                    <Input
                      type="number"
                      step={isWeightProduct(manualQtyProduct.unit) ? "0.001" : "1"}
                      value={manualQtyValue}
                      onChange={(e) =>
                        setManualQtyValue(
                          filterQtyInput(e.target.value, isWeightProduct(manualQtyProduct.unit)),
                        )
                      }
                      placeholder={isWeightProduct(manualQtyProduct.unit) ? "0,5" : "1"}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setManualQtyOpen(false);
                          onProductClick(manualQtyProduct); // +1 par défaut si vide
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          const qty = Math.max(1, parseQty(manualQtyValue, 1));
                          setLineQty(manualQtyProduct, qty);
                          setManualQtyOpen(false);
                        }}
                      >
                        Valider ({manualQtyValue || 1})
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button
              size="lg"
              className="w-full h-14 text-lg gap-2"
              disabled={!canValidate || saleMut.isPending}
              onClick={() =>
                saleMut.mutate({
                  lines: lines.map(({ key: _key, ...line }): CartLine => line),
                  cash_given: payMethod === "cash" ? cash : dueTotal,
                  customers_count: customers,
                  payment_method: payMethod,
                  ...(clientName.trim() ? { client_name: clientName.trim() } : {}),
                  ...(clientId ? { client_id: clientId } : {}),
                  // Date de retour attendue : elle ne vaut que pour un ACTIF loué dans
                  // le panier. Un produit vendu au comptoir n'en porte pas, et lui en
                  // inventer une ferait apparaître l'actif dans un agenda de retour.
                  ...(lines.some((l) => products.find((p) => p.id === l.product_id)?.is_asset) &&
                  returnDate
                    ? { expected_return_date: new Date(returnDate).getTime() }
                    : {}),
                })
              }
            >
              <CheckCircle2 className="h-5 w-5" />
              Valider l'encaissement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voile « Vente validée » : son + animation, aucun bouton à cliquer — il s'efface
          tout seul et le serveur enchaîne directement la vente suivante. */}
      <AnimatePresence>
        {saleFlash && (
          <motion.div
            key="sale-flash"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4 text-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <motion.span
                className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 320, damping: 14 }}
              >
                <CheckCircle2 className="h-12 w-12" />
              </motion.span>
              <p className="text-2xl font-bold">Vente validée</p>
              <p className="text-muted-foreground tabular-nums">
                {formatFCFA(saleFlash.total)}
                {saleFlash.method === "cash"
                  ? ` · Monnaie rendue ${formatFCFA(saleFlash.change)}`
                  : ` · ${paymentLabel(saleFlash.method)}`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
