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
  Wallet,
  ArrowRight,
  CircleAlert,
  ArrowDownUp,
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
  type StockMovement,
} from "@/lib/db";
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
  DialogTrigger,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/stocks")({
  head: () => ({
    meta: [
      { title: "Stocks & Produits — ELYNDRA CAISSE" },
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

const STATE_LABEL: Record<Exclude<StockState, "service">, string> = {
  out: "Rupture",
  low: "Stock faible",
  ok: "Disponible",
};

const REASON_LABEL: Record<StockMovement["reason"], string> = {
  replenishment: "Réapprovisionnement",
  sale: "Vente",
  round: "Commande table",
  cancellation: "Annulation vente",
  correction: "Correction",
  creation: "Création",
};

/** Jauge 10 segments : pleine à 4× le seuil (seuil 5 → pleine à 20), bornée. */
function StockBar({ product }: { product: Product }) {
  const threshold = thresholdOf(product);
  const pct = Math.max(0.04, Math.min(1, product.stock / (threshold * 4)));
  const filled = Math.round(pct * 10);
  const color =
    product.stock <= 0
      ? "bg-destructive"
      : product.stock <= threshold
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={cn("h-1.5 w-2 rounded-sm", i < filled ? color : "bg-muted")} />
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  // Couleur uniquement quand elle porte une information : neutre sinon.
  const iconClass =
    tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3.5">
        <span
          className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconClass)}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-base font-bold leading-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type StatusFilter = "all" | "low" | "out";
type SortKey = "name" | "stock" | "price" | "updated" | "bestsellers";

function StocksPage() {
  const qc = useQueryClient();
  const { isService } = useClusterFeatures();

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
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        !(p.barcode ?? "").toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "all") {
        const s = stateOf(p);
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

  // Journal global.
  const [movementsOpen, setMovementsOpen] = useState(false);

  const detailProduct = products.find((p) => p.id === detailId) ?? null;
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

  const statusChips: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: products.length },
    { key: "low", label: "Stock faible", count: stats.low },
    { key: "out", label: "Rupture", count: stats.out },
  ];

  return (
    <div className="app-container space-y-5 py-6">
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 xs:flex-row xs:items-end xs:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-page-title font-bold">
            <Package className="h-6 w-6 shrink-0" /> Stocks & Produits
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos produits, vos quantités et vos réapprovisionnements.
          </p>
        </div>
        {/* `flex-wrap` : les trois actions se répartissent sur deux lignes au
            besoin — « Nouveau produit » ne dépassera jamais l'écran (320px). */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="xs:h-9" onClick={() => setMovementsOpen(true)}>
            <History className="h-4 w-4 mr-1.5" />
            <span className="hidden xs:inline">Mouvements</span>
            <span className="xs:hidden">Journal</span>
          </Button>
          <Dialog open={stockOpen} onOpenChange={setStockOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PackagePlus className="h-4 w-4 mr-1.5" /> Ajouter du stock
              </Button>
            </DialogTrigger>
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
            <DialogTrigger asChild>
              {/* Libellé court sous 480px : le bouton reste entier et lisible
                  même en 320px (« + Nouveau »), complet au-delà. */}
              <Button className="xs:h-9" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden xs:inline">Nouveau produit</span>
                <span className="xs:hidden">Nouveau</span>
              </Button>
            </DialogTrigger>
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
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Prestation
                </Button>
              </DialogTrigger>
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
        </div>
      </div>

      {/* ── Résumé du stock ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Valeur du stock" value={formatFCFA(stats.value)} />
        <StatCard icon={Package} label="Produits" value={String(products.length)} />
        <StatCard
          icon={TriangleAlert}
          label="Stock faible"
          value={String(stats.low)}
          tone="warning"
        />
        <StatCard icon={CircleAlert} label="Ruptures" value={String(stats.out)} tone="danger" />
      </div>

      {/* ── Recherche + tri ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="pl-9 h-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-[210px] h-10">
            <ArrowDownUp className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
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

      {/* ── Filtres statut + catégories ────────────────────────────────────── */}
      {/* Rangées à défilement horizontal CONTRÔLÉ (chip-row) : les filtres ne
          réorganisent plus la page en pile de lignes, ils glissent sous le
          pouce — et débordent DANS la gouttière (bleed-x) pour partir du bord. */}
      <div className="space-y-2">
        <div className="chip-row bleed-x">
          {statusChips.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={cn(
                "min-h-11 rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-9",
                statusFilter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {label} · {count}
            </button>
          ))}
        </div>
        {categories.length > 1 && (
          <div className="chip-row bleed-x">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "min-h-11 rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-9",
                categoryFilter === null
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-accent",
              )}
            >
              Toutes catégories · {products.length}
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={cn(
                  "min-h-11 rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-9",
                  categoryFilter === cat
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-accent",
                )}
              >
                {cat} · {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bloc attention ─────────────────────────────────────────────────── */}
      {attention.length > 0 && statusFilter === "all" && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm font-semibold">Attention au stock</p>
              <span className="text-xs text-muted-foreground">
                {attention.length} produit{attention.length > 1 ? "s" : ""} nécessite
                {attention.length > 1 ? "nt" : ""} votre attention.
              </span>
            </div>
            <ul className="space-y-1">
              {attention.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{p.name}</span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      stateOf(p) === "out" ? "text-destructive" : "text-amber-600",
                    )}
                  >
                    {stateOf(p) === "out"
                      ? "Rupture"
                      : `${p.stock} unité${p.stock > 1 ? "s" : ""} restante${p.stock > 1 ? "s" : ""}`}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setStatusFilter(attention.some((p) => stateOf(p) === "low") ? "low" : "out")
              }
            >
              Voir les produits concernés
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Liste des produits ─────────────────────────────────────────────── */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Aucun produit. Cliquez sur « Nouveau produit » pour commencer.
            </p>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aucun produit ne correspond à la recherche ou aux filtres.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
          {/* Une colonne sur téléphone, deux dès qu'elles tiennent, trois puis
              quatre sur les grands écrans : les cartes ne s'étirent jamais en
              bandes de 700px sur un 1920. */}
          {visible.map((p) => {
            const state = stateOf(p);
            const isServiceItem = state === "service";
            return (
              <Card
                key={p.id}
                className="cursor-pointer py-0 transition-colors hover:border-primary/40 hover:bg-accent/30"
                onClick={() => setDetailId(p.id)}
              >
                <CardContent className="flex items-start gap-3 p-3.5">
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted/40",
                        isServiceItem ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.category}</p>
                    <div className="mt-1.5 flex items-end justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatFCFA(p.price)}
                      </span>
                      {!isServiceItem ? (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground tabular-nums">
                            Stock :{" "}
                            <span
                              className={cn(
                                "font-semibold",
                                state === "out" ? "text-destructive" : "text-foreground",
                              )}
                            >
                              {p.stock}
                            </span>
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <StockBar product={p} />
                            <span
                              className={cn(
                                "w-[86px] text-left text-[11px] leading-none",
                                state === "out"
                                  ? "font-medium text-destructive"
                                  : state === "low"
                                    ? "font-medium text-amber-600"
                                    : "text-muted-foreground",
                              )}
                            >
                              {STATE_LABEL[state]}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Actif</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-1 -mt-1 h-8 w-8 shrink-0"
                        aria-label={`Actions sur ${p.name}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
      <MovementsDialog open={movementsOpen} onOpenChange={setMovementsOpen} />

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
            positive ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const isMobile = useIsMobile(768);
  const { data: movements = [] } = useQuery({
    queryKey: ["movements", "all"],
    queryFn: () => listStockMovements({ limit: 50 }),
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
