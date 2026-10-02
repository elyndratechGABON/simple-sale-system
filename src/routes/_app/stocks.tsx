// Stocks & Produits — centre de pilotage du stock, pas une simple liste.
//
// Résumé chiffré en tête (valeur, volumes, alertes), recherche/filtres/tri, bloc
// d'attention, puis fiche produit compacte avec jauge de stock et actions rapides
// (réapprovisionner, corriger, modifier, supprimer). Le journal des mouvements répond
// au « pourquoi ce stock a baissé ? » — chaque variation est écrite par src/lib/db.ts,
// la page ne fait que le lire.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  PackagePlus,
  PackageMinus,
  Search,
  Minus,
  MoreVertical,
  History,
  TriangleAlert,
  ArrowRight,
  CircleAlert,
  ArrowDownUp,
  Check,
  ChevronRight,
  Layers,
  LayoutGrid,
  Sparkles,
  Tag,
  TrendingDown,
  CalendarDays,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  addStock,
  removeStock,
  deleteProduct,
  listProducts,
  listStockMovements,
  listSales,
  getSaleItemsForSales,
  type Product,
  type SaleItem,
  type StockMovement,
} from "@/lib/db";
import { RentalReminderBanner } from "@/components/RentalReminderBanner";
import { lastDaysRange } from "@/lib/analytics";
import { formatFCFA, formatRelative, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductForm } from "@/components/ProductForm";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
import { usePreferences } from "@/hooks/use-preferences";
import { ProductCard } from "@/components/ProductCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/stocks")({
  head: () => ({
    meta: [
      { title: "Stock & Produits — ELYNDRA CAISSE" },
      {
        name: "description",
        content: "Gérez vos produits, vos quantités et vos réapprovisionnements.",
      },
    ],
  }),
  component: StocksPage,
});

type StockState = "service" | "out" | "low" | "ok";

/** Seuil effectif du produit : son propre seuil, sinon le défaut global (5). */
function thresholdOf(p: Product): number {
  return typeof p.min_stock === "number" && p.min_stock > 0 ? p.min_stock : 5;
}

/** État de stock d'une fiche. Service ou stock illimité → « service », jamais alarmé. */
function stateOf(p: Product): StockState {
  if (p.type === "service" || !Number.isFinite(p.stock)) return "service";
  if (p.stock <= 0) return "out";
  if (p.stock <= thresholdOf(p)) return "low";
  return "ok";
}

/** État d'une variante isolée (seuil fixe 5 faute de seuil propre à la variante). */
function variantState(stock: number | undefined): Exclude<StockState, "service"> {
  if (stock === undefined || !Number.isFinite(stock)) return "ok";
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "ok";
}

type ChipTone = "default" | "warning" | "danger";

/**
 * Chip de filtre dans un rangée scrollable horizontalement.
 *
 * Remplace les anciennes cards de 64 px de haut qui prenaient quatre hauteurs de
 * grille avant même d'atteindre les produits. Ici une ligne de 44 px, balayable au
 * doigt, avec le chip suivant dépasser du bord pour signaler qu'il y en a d'autres.
 *
 * Le ton (avertissement / danger) ne s'applique qu'aux chips INACTIFS : l'actif passe
 * toujours au vert de marque, sinon on ne sait plus jamais lequel est sélectionné.
 */
function FilterChip({
  label,
  count,
  active,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  icon?: LucideIcon;
  tone?: ChipTone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97]",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : tone === "danger"
            ? "border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
            : tone === "warning"
              ? "border-amber-500/25 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
      )}
    >
      {Icon && (
        <Icon
          className={cn("h-4 w-4 shrink-0", active && "text-primary-foreground")}
          aria-hidden
        />
      )}
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Titre de section + rangée de chips. Le rangée défile seule : la page, elle, ne défile
 *  jamais horizontalement — un `overflow-x-auto` sur la rangée suffit. */
function ChipRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="-mx-[var(--page-gutter)] flex gap-1.5 overflow-x-auto px-[var(--page-gutter)] pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

const REASON_LABEL: Record<StockMovement["reason"], string> = {
  replenishment: "Réapprovisionnement",
  sale: "Vente",
  round: "Commande table",
  cancellation: "Annulation vente",
  correction: "Correction",
  creation: "Création",
};

/**
 * Zone du bandeau de synthèse. La couleur ne teinte QUE le chiffre en état
 * d'alerte : un fond rouge sur toute la zone transformerait un compteur en
 * alarme, alors qu'il n'y a rien d'alarmant dans le nombre lui-même.
 */
function KpiCell({
  label,
  value,
  tone = "neutral",
  primary,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
  primary?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p
        className={cn(
          "truncate font-semibold leading-tight tabular-nums",
          primary ? "text-lg font-bold sm:text-xl" : "text-sm",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] uppercase leading-none tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

type StatusFilter = "all" | "service" | "low" | "out";
type SortKey = "name" | "stock" | "price" | "updated" | "bestsellers";

function StocksPage() {
  return (
    <>
      <RentalReminderBanner />
      <RentalCalendarIndicators />
      <StocksPageContent />
    </>
  );
}

function StocksPageContent() {
  const qc = useQueryClient();
  const { isService } = useClusterFeatures();
  // Champs visibles sur les cards (§10). La liste est ordonnée : l'ordre du tableau
  // est l'ordre d'affichage. Relue de localStorage via les préférences, donc le
  // réglage survit à un redémarrage (§29).
  const { stockCardFields: cardFields } = usePreferences();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  // « Plus vendus » : quantités vendues sur 30 jours, par product_id. Une seule
  // requête, partagée par la clé React Query avec le dashboard/rapports.
  const monthRange = useMemo(() => lastDaysRange(30), []);
  const { data: monthData } = useQuery({
    queryKey: ["sales", "range", monthRange.from, monthRange.to],
    queryFn: async () => {
      const sales = await listSales(monthRange.from, monthRange.to);
      const items = await getSaleItemsForSales(sales.map((s) => s.id));
      return { sales, items };
    },
    staleTime: 60_000,
  });
  const soldQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of monthData?.items ?? []) {
      if (!item.product_id) continue;
      map.set(item.product_id, (map.get(item.product_id) ?? 0) + item.quantity);
    }
    return map;
  }, [monthData]);

  // « Sollicité il y a 1 j / 3 j » : date de la dernière vente de chaque produit sur
  // les 30 derniers jours, ventes triées du plus ancien au plus récent pour laisser la
  // dernière gagner. Réponse visuelle au « pourquoi ce stock bouge-t-il ? ».
  const itemsBySale = useMemo(() => {
    const map = new Map<string, SaleItem[]>();
    for (const it of monthData?.items ?? []) {
      const arr = map.get(it.sale_id) ?? [];
      arr.push(it);
      map.set(it.sale_id, arr);
    }
    return map;
  }, [monthData]);
  const lastSoldAtByProduct = useMemo(() => {
    const map = new Map<string, number>();
    const sales = [...(monthData?.sales ?? [])].sort((a, b) => a.timestamp - b.timestamp);
    for (const s of sales) {
      for (const it of itemsBySale.get(s.id) ?? []) {
        if (it.product_id && it.quantity > 0) map.set(it.product_id, s.timestamp);
      }
    }
    return map;
  }, [monthData, itemsBySale]);

  // ── Recherche / filtres / tri ───────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  // ── Résumé du stock ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let value = 0;
    let low = 0;
    let out = 0;
    for (const p of products) {
      if (stateOf(p) === "service") continue;
      if (Number.isFinite(p.stock)) value += p.price * p.stock;
      const state = stateOf(p);
      if (state === "out") out += 1;
      else if (state === "low") low += 1;
    }
    return { value, low, out };
  }, [products]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);

  // Produits en difficulté : ruptures d'abord, puis stock faible.
  const attention = useMemo(
    () =>
      products
        .filter((p) => {
          const s = stateOf(p);
          return s === "out" || s === "low";
        })
        .sort((a, b) => (stateOf(a) === "out" ? -1 : 1) - (stateOf(b) === "out" ? -1 : 1)),
    [products],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q))
        return false;
      if (statusFilter !== "all") {
        const s = stateOf(p);
        // « Prestations » cible le TYPE, pas l'état : un produit à stock illimité
        // n'est pas une prestation.
        if (statusFilter === "service" && p.type !== "service") return false;
        if (statusFilter === "low" && s !== "low") return false;
        if (statusFilter === "out" && s !== "out") return false;
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "stock":
          if (!Number.isFinite(a.stock)) return 1;
          if (!Number.isFinite(b.stock)) return -1;
          return a.stock - b.stock;
        case "price":
          return b.price - a.price;
        case "updated":
          return b.updated_at - a.updated_at;
        case "bestsellers":
          return (soldQtyByProduct.get(b.id) ?? 0) - (soldQtyByProduct.get(a.id) ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [products, search, statusFilter, categoryFilter, sortBy, soldQtyByProduct]);

  // ── Dialogues ──────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [prestationOpen, setPrestationOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Ajout de stock : même sélecteur que l'ancienne page, enrichi des champs de journal.
  const [stockOpen, setStockOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  // Retrait de stock (correction).
  const [removeOpen, setRemoveOpen] = useState(false);
  // Produit dont on demande la suppression : le dialogue de confirmation vise CE produit.
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [removeProductId, setRemoveProductId] = useState("");
  const [removeQty, setRemoveQty] = useState("");

  // Journal global. `movementsProduct` le restreint à une fiche quand on y entre
  // depuis le menu d'une card produit ; `null` = tous les mouvements confondus.
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [movementsProductId, setMovementsProductId] = useState<string | null>(null);

  const detailProduct = products.find((p) => p.id === detailId) ?? null;
  const detailLastSoldAt = detailProduct ? lastSoldAtByProduct.get(detailProduct.id) : undefined;
  const selectedProduct = products.find((p) => p.id === stockProductId) ?? null;
  const removeProduct = products.find((p) => p.id === removeProductId) ?? null;

  function openAddStock(p: Product) {
    setStockProductId(p.id);
    setAddQty("");
    setUnitCost("");
    setSupplier("");
    setMovementNote("");
    setStockOpen(true);
  }

  const QUICK_QTYS = [1, 5, 10, 50];

  const addStockMut = useMutation({
    mutationFn: () => {
      if (!selectedProduct) throw new Error("Sélectionnez un produit.");
      const qty = Number(addQty) || 0;
      if (qty <= 0) throw new Error("Quantité invalide.");
      return addStock(selectedProduct.id, qty, {
        unit_cost: Number(unitCost) || undefined,
        supplier: supplier.trim() || undefined,
        note: movementNote.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success(`${updated.name} : +${addQty} (total ${updated.stock})`);
      setStockOpen(false);
      setStockProductId("");
      setAddQty("");
      setUnitCost("");
      setSupplier("");
      setMovementNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStockMut = useMutation({
    mutationFn: () => {
      if (!removeProduct) throw new Error("Produit introuvable.");
      const qty = Number(removeQty) || 0;
      if (qty <= 0) throw new Error("Quantité invalide.");
      return removeStock(removeProduct.id, qty);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success(`${updated.name} : retrait enregistré (total ${updated.stock})`);
      setRemoveOpen(false);
      setRemoveProductId("");
      setRemoveQty("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprimé");
    },
  });

  const stockableProducts = useMemo(
    () =>
      products
        .filter((p) => Number.isFinite(p.stock))
        .filter(
          (p) =>
            !stockSearch ||
            p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
            p.category.toLowerCase().includes(stockSearch.toLowerCase()),
        ),
    [products, stockSearch],
  );

  const serviceCount = products.filter((p) => p.type === "service").length;

  const statusChips: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: products.length },
    ...(serviceCount > 0
      ? [{ key: "service" as const, label: "Prestations", count: serviceCount }]
      : []),
    { key: "low", label: "Stock faible", count: stats.low },
    { key: "out", label: "Rupture", count: stats.out },
  ];

  const STATUS_ICON: Record<StatusFilter, LucideIcon> = {
    all: LayoutGrid,
    service: Sparkles,
    low: TrendingDown,
    out: CircleAlert,
  };

  return (
    <div className="app-container">
      <div className="mx-auto w-full max-w-[1280px] space-y-4 py-4">
        {/* ── En-tête ─────────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-page-title font-bold">
            <Package className="h-6 w-6 shrink-0" /> Stock & Produits
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos produits, vos quantités et vos réapprovisionnements.
          </p>
        </div>
        <Dialog open={stockOpen} onOpenChange={setStockOpen}>
          <DialogContent className="sm:max-w-lg">
            <div className="space-y-4">
              {!selectedProduct ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Rechercher un produit…"
                      className="pl-9 h-10"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                    {stockableProducts.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-6">
                        Aucun produit trouvé.
                      </p>
                    ) : (
                      stockableProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setStockProductId(p.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                            "hover:border-primary/50 hover:bg-accent/50",
                          )}
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2.5">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-md border object-cover"
                                loading="lazy"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.category} · {formatFCFA(p.price)}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={stateOf(p) === "ok" ? "secondary" : "destructive"}
                            className="ml-2 shrink-0 tabular-nums"
                          >
                            Stock : {p.stock}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStockProductId("");
                      setAddQty("");
                    }}
                    className="w-full flex items-center justify-between rounded-lg border border-primary bg-accent/50 p-3 text-left ring-1 ring-primary"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedProduct.category} · Stock actuel : {selectedProduct.stock}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      Changer
                    </Badge>
                  </button>

                  <div>
                    <Label htmlFor="add-qty">Quantité ajoutée</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-10 w-10"
                        onClick={() => {
                          const cur = Number(addQty) || 0;
                          if (cur > 0) setAddQty(String(cur - 1));
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="add-qty"
                        inputMode="numeric"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        className="h-12 text-lg font-bold text-center"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && Number(addQty) > 0) addStockMut.mutate();
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-10 w-10"
                        onClick={() => {
                          const cur = Number(addQty) || 0;
                          setAddQty(String(cur + 1));
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {QUICK_QTYS.map((q) => (
                        <Button
                          key={q}
                          variant={Number(addQty) === q ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setAddQty(String(q))}
                        >
                          +{q}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Nouveau stock</p>
                    <p className="text-xl font-bold tabular-nums">
                      {selectedProduct.stock + (Number(addQty) || 0)}
                    </p>
                  </div>

                  {/* Champs optionnels du journal de mouvements */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="unit-cost">Prix d'achat unitaire</Label>
                      <Input
                        id="unit-cost"
                        inputMode="numeric"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value.replace(/\D/g, ""))}
                        placeholder="Optionnel"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier">Fournisseur</Label>
                      <Input
                        id="supplier"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="Optionnel"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="movement-note">Note</Label>
                    <Input
                      id="movement-note"
                      value={movementNote}
                      onChange={(e) => setMovementNote(e.target.value)}
                      placeholder="Optionnelle — ex : livraison du matin"
                      className="mt-1.5"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStockOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => addStockMut.mutate()}
                disabled={
                  !selectedProduct || !addQty || Number(addQty) <= 0 || addStockMut.isPending
                }
              >
                {addStockMut.isPending ? "Ajout…" : "Ajouter au stock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <ProductForm
            editing={editing}
            onClose={() => {
              setEditOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
        {isService && (
          <Dialog open={prestationOpen} onOpenChange={setPrestationOpen}>
            <ProductForm
              editing={editing}
              onClose={() => {
                setPrestationOpen(false);
                setEditing(null);
              }}
              defaultCategory="Service"
              defaultType="service"
            />
          </Dialog>
        )}

        {/* ── Résumé du stock ────────────────────────────────────────────────── */}
        {/* Un seul bandeau à 4 zones au lieu de 4 cards. Les données sont
            identiques — `stats` n'a pas changé — seul l'encombrement disparaît :
            ces 4 cards prenaient ~370 px avant d'atteindre les actions. La
            couleur ne teinte QUE le chiffre en état d'alerte, jamais le bloc
            entier : quatre pastilles rouges alignées font plus de bruit que
            d'information. */}
        <Card>
          <CardContent className="grid grid-cols-[1.5fr_1fr_1fr_1fr] divide-x p-0">
            <KpiCell label="Stock" value={formatFCFA(stats.value)} primary />
            <KpiCell label="Produits" value={String(products.length)} />
            <KpiCell label="Faible" value={String(stats.low)} tone="warning" />
            <KpiCell label="Rupture" value={String(stats.out)} tone="danger" />
          </CardContent>
        </Card>

        {/* ── Actions : un seul CTA principal, une action secondaire ─────────── */}
        {/* 68 px au lieu de 76–84 : le CTA reste le plus visible de la page
            (fond plein, icône pleine) mais ne mange plus une ligne et demie. */}
        <div className="grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setEditOpen(true);
            }}
            className="group flex h-[68px] min-w-0 w-full items-center gap-3 rounded-xl bg-primary px-3 text-left text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
              <Plus className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">Ajouter du stock</span>
              <span className="mt-0.5 block truncate text-xs text-primary-foreground/75">
                Enregistrer un nouveau produit
              </span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-primary-foreground/70 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setMovementsProductId(null);
              setMovementsOpen(true);
            }}
            className="group flex h-[68px] min-w-0 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              <History className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">Journal</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                Voir l'historique des mouvements
              </span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>

          {isService && (
            <div className="flex md:col-span-2 md:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setEditing(null);
                  setPrestationOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Prestation
              </Button>
            </div>
          )}
        </div>

        {/* ── Recherche ──────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            className="h-14 rounded-xl bg-card pl-11 md:text-base"
          />
        </div>

        {/* ── Tri ────────────────────────────────────────────────────────────── */}
        <div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-14 w-full rounded-xl">
              <ArrowDownUp className="h-4 w-4 mr-1.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Trier : Nom</SelectItem>
              <SelectItem value="stock">Trier : Stock</SelectItem>
              <SelectItem value="price">Trier : Prix</SelectItem>
              <SelectItem value="updated">Trier : Dernière modification</SelectItem>
              <SelectItem value="bestsellers">Trier : Plus vendus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Filtres : deux rangées balayables, indépendantes mais combinables ── */}
        {/* Le filtrage, les compteurs et les handlers sont ceux d'avant : seuls la
            présentation change. Les deux rangées sont distinctes, donc « stock faible »
            + « Chaussures » se cumulent comme avant. */}
        <div className="space-y-4">
          <ChipRow title="État du stock">
            {statusChips.map(({ key, label, count }) => (
              <FilterChip
                key={key}
                label={label}
                count={count}
                active={statusFilter === key}
                icon={STATUS_ICON[key]}
                tone={key === "out" ? "danger" : key === "low" ? "warning" : "default"}
                onClick={() => setStatusFilter(key)}
              />
            ))}
          </ChipRow>

          {categories.length > 1 && (
            <ChipRow title="Catégories">
              <FilterChip
                label="Toutes"
                count={products.length}
                active={categoryFilter === null}
                icon={Layers}
                onClick={() => setCategoryFilter(null)}
              />
              {categories.map(([cat, count]) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  count={count}
                  active={categoryFilter === cat}
                  icon={Tag}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                />
              ))}
            </ChipRow>
          )}
        </div>

        {/* ── Bloc attention ─────────────────────────────────────────────────── */}
        {/* Replié sur une ligne. Il y Occupait ~370 px pour répéter les compteurs que
            les chips « Stock faible » et « Rupture » affichent déjà juste au-dessus ;
            la liste détaillée est accessible d'un tap, elle n'a pas besoin d'être
            dépliée en permanence au-dessus des produits. */}
        {attention.length > 0 && statusFilter === "all" && (
          <button
            type="button"
            onClick={() =>
              setStatusFilter(attention.some((p) => stateOf(p) === "low") ? "low" : "out")
            }
            className="flex w-full items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-left transition-colors hover:bg-amber-500/10"
          >
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="min-w-0 flex-1 truncate text-xs">
              <span className="font-semibold">Attention au stock</span> ·{" "}
              {attention.length} produit{attention.length > 1 ? "s" : ""} à surveiller
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          </button>
        )}

        {/* ── Liste des produits ─────────────────────────────────────────────── */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Aucun produit. Cliquez sur « Ajouter du stock » pour commencer.
              </p>
            </CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aucun produit ne correspond à la recherche ou aux filtres.
          </p>
        ) : (
          <>
            {/* Le compte affiche la file réellement rendue APRÈS filtres et recherche,
                pas le total du catalogue : « 2 » quand deux articles correspondent
                évite de faire défiler pour le découvrir. */}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Produits
              </p>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {visible.length}
                {visible.length < products.length && ` sur ${products.length}`}
              </p>
            </div>
            {/* Deux colonnes dès 360 px (§24), jusqu'à cinq sur grand écran. Les
                dimensions des cards ne dépendent PAS des champs cochés : la grille ne
                bouge jamais quand on change l'affichage. */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((p) => {
              const state = stateOf(p);
              const isServiceItem = state === "service";
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  fields={cardFields}
                  state={state}
                  lastSoldAt={lastSoldAtByProduct.get(p.id)}
                  onOpen={() => setDetailId(p.id)}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Actions sur ${p.name}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isServiceItem && Number.isFinite(p.stock) && (
                          <>
                            <DropdownMenuItem onClick={() => openAddStock(p)}>
                              <PackagePlus className="h-4 w-4 mr-2" /> Ajouter du stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRemoveProductId(p.id);
                                setRemoveQty("");
                                setRemoveOpen(true);
                              }}
                            >
                              <PackageMinus className="h-4 w-4 mr-2" /> Retirer du stock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(p);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        {/* Journal du produit : la page affiche déjà l'historique
                            global, mais depuis une fiche on veut les mouvements de
                            CET article. Même source, filtre par produit. */}
                        <DropdownMenuItem
                          onClick={() => {
                            setMovementsProductId(p.id);
                            setMovementsOpen(true);
                          }}
                        >
                          <History className="h-4 w-4 mr-2" /> Voir le journal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              );
            })}
            </div>
          </>
        )}

        {/* ── Fiche produit ──────────────────────────────────────────────────── */}
        <Dialog open={detailId !== null} onOpenChange={(v) => !v && setDetailId(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            {detailProduct && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {detailProduct.photo ? (
                      <img
                        src={detailProduct.photo}
                        alt=""
                        className="h-12 w-12 rounded-lg border object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 truncate">{detailProduct.name}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <InfoCell label="Catégorie" value={detailProduct.category} />
                    <InfoCell label="Prix de vente" value={formatFCFA(detailProduct.price)} />
                    <InfoCell
                      label="Prix d'achat"
                      value={detailProduct.cost > 0 ? formatFCFA(detailProduct.cost) : "Non saisi"}
                    />
                    <InfoCell label="Marge" value={marginLabel(detailProduct)} />
                    {stateOf(detailProduct) === "service" ? (
                      <InfoCell label="Type" value="Service — sans stock" />
                    ) : (
                      <>
                        <InfoCell label="Stock actuel" value={String(detailProduct.stock)} />
                        <InfoCell
                          label="Seuil d'alerte"
                          value={`${thresholdOf(detailProduct)}${
                            typeof detailProduct.min_stock === "number" ? "" : " (défaut)"
                          }`}
                        />
                        {/* Réponse directe au « il y a 1 j, il y a 3 j » : dernière vente
                          connue sur les 30 derniers jours. */}
                        <InfoCell
                          label="Dernière vente"
                          value={
                            detailLastSoldAt !== undefined
                              ? formatRelative(detailLastSoldAt)
                              : "Aucune sur 30 j"
                          }
                        />
                      </>
                    )}
                  </div>

                  <MovementList
                    productId={detailProduct.id}
                    limit={10}
                    emptyLabel="Aucun mouvement enregistré pour ce produit."
                  />

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        const p = detailProduct;
                        setDetailId(null);
                        openAddStock(p);
                      }}
                    >
                      <PackagePlus className="h-4 w-4 mr-1.5" /> Ajouter du stock
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const p = detailProduct;
                        setDetailId(null);
                        setEditing(p);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1.5" /> Modifier le produit
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Retrait de stock ───────────────────────────────────────────────── */}
        <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Retirer du stock</DialogTitle>
            </DialogHeader>
            {removeProduct && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{removeProduct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock actuel : {removeProduct.stock}
                  </p>
                </div>
                <div>
                  <Label htmlFor="remove-qty">Quantité retirée</Label>
                  <Input
                    id="remove-qty"
                    inputMode="numeric"
                    value={removeQty}
                    onChange={(e) => setRemoveQty(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="mt-1.5 h-11 text-lg font-bold text-center"
                    autoFocus
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Nouveau stock</p>
                  <p className="text-lg font-bold tabular-nums">
                    {Math.max(0, removeProduct.stock - (Number(removeQty) || 0))}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRemoveOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                disabled={!removeProduct || !(Number(removeQty) > 0) || removeStockMut.isPending}
                onClick={() => removeStockMut.mutate()}
              >
                {removeStockMut.isPending ? "…" : "Retirer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Journal global des mouvements ──────────────────────────────────── */}
        <MovementsDialog
          open={movementsOpen}
          onOpenChange={(v) => {
            setMovementsOpen(v);
            // Refermé : on oublie le filtre produit pour que la prochaine ouverture
            // depuis le bandeau « Journal » reparte sur l'historique complet.
            if (!v) setMovementsProductId(null);
          }}
          productId={movementsProductId}
        />

        {/* ── Confirmation de suppression : une seule étape après la demande ── */}
        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le produit disparaît du catalogue et de la caisse. Ses ventes déjà enregistrées
                restent intactes dans les rapports.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) removeMut.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function marginLabel(p: Product): string {
  if (!(p.price > 0) || !Number.isFinite(p.price)) return "—";
  if (p.cost <= 0) return "—";
  return `${Math.round(((p.price - p.cost) / p.price) * 100)} %`;
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const positive = movement.delta > 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            positive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {positive ? "+" : "−"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {movement.product_name} ×{Math.abs(movement.delta)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {REASON_LABEL[movement.reason]}
            {movement.supplier ? ` · ${movement.supplier}` : ""}
            {movement.note ? ` · ${movement.note}` : ""}
          </p>
        </div>
      </div>
      <p className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {formatRelative(movement.created_at)}
        <span className="block">{formatTime(movement.created_at)}</span>
      </p>
    </div>
  );
}

/** Liste des mouvements d'un produit, pour la fiche détaillée. */
function MovementList({
  productId,
  limit,
  emptyLabel,
}: {
  productId: string;
  limit: number;
  emptyLabel: string;
}) {
  const { data: movements = [] } = useQuery({
    queryKey: ["movements", productId],
    queryFn: () => listStockMovements({ productId, limit }),
  });
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Historique des mouvements</p>
      {movements.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {movements.map((m) => (
            <MovementRow key={m.id} movement={m} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Journal global : derniers mouvements tous produits confondus.
 *
 * Bottom sheet SUR TÉLÉPHONE (<md) — c'est une liste de consultation, le geste
 * naturel du pouce est de la tirer depuis le bas et de la refermer d'un
 * glissement ; modale centrée au-delà, où le pointeur n'a pas de préférence.
 * Même contenu dans les deux conteneurs : un seul jeu d'enfants, zéro doublon.
 */
function MovementsDialog({
  open,
  onOpenChange,
  productId = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Restreint l'historique à une fiche. `null` = tous les mouvements. */
  productId?: string | null;
}) {
  const isMobile = useIsMobile(768);
  // Le `productId` entre dans la clé de cache : changer de fiche recharge, alors
  // qu'ouvrir le dialogue deux fois sur la même ne requête pas.
  const { data: movements = [] } = useQuery({
    queryKey: ["movements", productId ?? "all"],
    queryFn: () => listStockMovements({ limit: 50, ...(productId ? { productId } : {}) }),
    enabled: open,
  });

  const content = (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="h-4 w-4" /> Historique des mouvements
        </DialogTitle>
      </DialogHeader>
      {movements.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          Aucun mouvement enregistré. Réapprovisionnez un produit ou effectuez une vente.
        </p>
      ) : (
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {movements.map((m) => (
            <MovementRow key={m.id} movement={m} />
          ))}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle className="px-4 pt-1 text-base font-semibold">
            <span className="flex items-center justify-center gap-2">
              <History className="h-4 w-4" /> Historique des mouvements
            </span>
          </DrawerTitle>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{content}</DialogContent>
    </Dialog>
  );
}

function RentalCalendarIndicators() {
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const reminders =
    products?.filter((p) => p.is_asset && p.return_date && p.return_date > Date.now()) ?? [];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {reminders.map((r) => {
        const d = new Date(r.return_date!);
        const soon = r.return_date! - Date.now() < 3 * 86400000;
        return (
          <button
            key={r.id}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs transition-all",
              soon ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40" : "border-border",
            )}
            title={r.name + " — retour le " + d.toLocaleDateString("fr-FR")}
          >
            <CalendarDays className={cn("h-4 w-4", soon ? "text-amber-600" : "text-primary")} />
            <span className="font-medium truncate max-w-[8rem]">{r.name}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {d.toLocaleDateString("fr-FR")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
