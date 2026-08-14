import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
  Lock,
} from "lucide-react";
import {
  addRound,
  cancelSale,
  closeDay,
  closeTable,
  createSale,
  getSaleItems,
  listOpenTables,
  listProducts,
  listSalesToday,
  openTable,
  payRound,
  payTable,
  type CartLine,
  type Category,
  type Product,
  type Sale,
  type SaleItem,
} from "@/lib/db";
import { formatFCFA, formatTime } from "@/lib/format";
import { usePreferences } from "@/hooks/use-preferences";
import { savePreferences } from "@/lib/settings";
import { verifyPin } from "@/lib/pin";
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
import { CloseDayDialog } from "@/components/CloseDayDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

// Ligne saisie à la main, pour encaisser sans catalogue (stocks pas encore initiés).
// Elle n'a pas de product_id : aucun stock n'est décrémenté à la vente.
interface FreeLine {
  key: string;
  name: string;
  price: number;
  cost: number;
  category: Category;
  quantity: number;
}

// `key` sert au rendu et aux handlers du panier ; CartLine reste le type envoyé à la DB.
type UiLine = CartLine & { key: string };

/**
 * Destination de ce que l'on est en train de saisir.
 *
 * `direct` : vente au comptoir, encaissée sur-le-champ — le comportement historique de
 * cette page, inchangé. `table` : la saisie est une TOURNÉE qui vient s'ajouter à une
 * addition ouverte, et aucun argent n'est demandé avant l'encaissement final.
 */
type Target = { kind: "direct" } | { kind: "table"; saleId: string };

/**
 * Panneau d'encaissement ouvert. `null` : fermé, on commande.
 * `table` : toute l'addition d'un coup — le geste de fin de service.
 * `round` : une TOURNÉE précise — encaissée au passage, la table reste ouverte pour la
 * suite de la commande.
 */
type Cashing = null | { kind: "table" } | { kind: "round"; orderedAt: number };

function PosPage() {
  const qc = useQueryClient();
  const { tables: tableLabels, tablesEnabled } = usePreferences();
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

  // Ventes réglées du jour : la barre « Aujourd'hui » donne au serveur le total courant
  // sans quitter la caisse, et porte la clôture de fin de service.
  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales", "today"],
    queryFn: listSalesToday,
  });
  const todayTotal = salesToday.reduce((s, x) => s + x.total, 0);

  const [target, setTarget] = useState<Target>({ kind: "direct" });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [freeLines, setFreeLines] = useState<FreeLine[]>([]);
  const [freeOpen, setFreeOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>("");
  const [filter, setFilter] = useState<Category | "Tous">("Tous");
  // Nombre de personnes servies par cette vente. Alimente le KPI « clients » des
  // rapports. Reste à 1 dans le cas courant — un client, une vente.
  const [customers, setCustomers] = useState(1);
  // Le panneau d'encaissement ne s'ouvre qu'à la demande : tant qu'il est fermé, aucun
  // champ « argent donné » ne traîne à l'écran pendant le service, et on ne peut pas
  // confondre « ajouter une tournée » avec « faire payer ». Il vise soit TOUTE la table
  // (fin du service), soit une tournée précise — encaissée au passage, la table reste
  // ouverte pour la suite de la commande.
  const [cashing, setCashing] = useState<Cashing>(null);
  const [cancelPinOpen, setCancelPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  // `lg` et non le défaut à 768 : c'est là que la mise en page passe en colonne unique,
  // et ce commutateur change la STRUCTURE (panneau latéral ou feuille), pas juste le style.
  const compact = useIsMobile(1024);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

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

  const lines: UiLine[] = useMemo(() => {
    const fromCatalog = Object.entries(cart)
      .map(([id, qty]): UiLine | null => {
        const p = products.find((x) => x.id === id);
        if (!p || qty <= 0) return null;
        return {
          key: p.id,
          product_id: p.id,
          name: p.name,
          price: p.price,
          cost: p.cost,
          category: p.category,
          quantity: qty,
        };
      })
      .filter((x): x is UiLine => Boolean(x));
    return [...fromCatalog, ...freeLines];
  }, [cart, products, freeLines]);

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

  // Total du panier en cours de saisie. Sur une table c'est le montant de la TOURNÉE, pas
  // celui de l'addition : `activeTable.total` porte l'addition, tenue à jour par addRound.
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
  const change = cash - dueNow;
  const insufficient = cash > 0 && change < 0;
  const canValidate = activeTable
    ? dueNow > 0 && cash >= dueNow
    : lines.length > 0 && cash >= total && total > 0;

  const filtered = filter === "Tous" ? products : products.filter((p) => p.category === filter);

  const saleMut = useMutation({
    mutationFn: () =>
      createSale({
        lines: lines.map(({ key: _key, ...line }): CartLine => line),
        cash_given: cash,
        customers_count: customers,
      }),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Vente enregistrée", {
        description: `Total ${formatFCFA(sale.total)} · Rendu ${formatFCFA(sale.change_due)}`,
      });
      resetCart();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openMut = useMutation({
    mutationFn: (label: string) => openTable(label),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      selectTarget({ kind: "table", saleId: sale.id });
      toast.success(`Table ${sale.table} ouverte`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Libération d'une table ouverte par erreur, cf. `closeTable` : refusée dès qu'une
  // tournée est passée, c'est alors « Annuler la table » et son PIN.
  const closeMut = useMutation({
    mutationFn: (saleId: string) => closeTable(saleId),
    onSuccess: (_void, saleId) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      if (target.kind === "table" && target.saleId === saleId) selectTarget({ kind: "direct" });
      toast.success("Table libérée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Le plan de salle vit dans les préférences : ajouter une table est un geste d'affichage,
  // pas une écriture métier — rien n'est ouvert, la carte apparaît simplement.
  function addTable() {
    savePreferences({ tables: [...tableLabels, nextTableLabel(tableLabels)] });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  const roundMut = useMutation({
    mutationFn: (saleId: string) =>
      addRound(
        saleId,
        lines.map(({ key: _key, ...line }): CartLine => line),
      ),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale_items", sale.id] });
      toast.success(`Tournée ajoutée à la table ${sale.table}`, {
        description: `Addition en cours : ${formatFCFA(sale.total)}`,
      });
      resetCart();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: (saleId: string) => payTable(saleId, cash),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale_items", sale.id] });
      toast.success(`Table ${sale.table} encaissée`, {
        description: `Total ${formatFCFA(sale.total)} · Rendu ${formatFCFA(sale.change_due)}`,
      });
      selectTarget({ kind: "direct" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Encaissement d'une TOURNÉE : la table reste ouverte, seules les lignes de cette
  // tournée passent en vente réglée (cf. payRound). L'invalidation du préfixe ["sales"]
  // rafraîchit le plan de salle, l'addition et l'historique d'un coup.
  const payRoundMut = useMutation({
    mutationFn: ({
      saleId,
      orderedAt,
      cash,
    }: {
      saleId: string;
      orderedAt: number;
      cash: number;
    }) => payRound(saleId, orderedAt, cash),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale_items", activeTable?.id] });
      toast.success(`Tournée encaissée sur la table ${sale.table}`, {
        description: `Total ${formatFCFA(sale.total)} · Rendu ${formatFCFA(sale.change_due)}`,
      });
      setCashing(null);
      setCashGiven("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelTableMut = useMutation({
    // `cancelSale` restaure déjà le stock et supprime logiquement vente et lignes : une
    // addition ouverte est une vente comme une autre, il n'y a pas de seconde annulation
    // à écrire.
    mutationFn: (saleId: string) => cancelSale(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Table annulée, stock restauré");
      setCancelPinOpen(false);
      setPin("");
      selectTarget({ kind: "direct" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDayMut = useMutation({
    mutationFn: closeDay,
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      setCloseOpen(false);
      toast.success(`${n} vente(s) clôturée(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Change de destination et remet à zéro tout ce qui n'a de sens que pour la précédente. */
  function selectTarget(next: Target) {
    setTarget(next);
    setCashing(null);
    resetCart();
  }

  function resetCart() {
    setCart({});
    setFreeLines([]);
    setCashGiven("");
    setCustomers(1);
    // La feuille se referme avec le panier qu'elle affichait : la laisser ouverte sur un
    // panier vide masquerait la grille d'articles juste après une vente.
    setSheetOpen(false);
  }

  function addOne(p: Product) {
    setCart((c) => {
      const next = (c[p.id] ?? 0) + 1;
      if (Number.isFinite(p.stock) && next > p.stock) {
        toast.warning(`Stock insuffisant pour ${p.name}`);
        return c;
      }
      return { ...c, [p.id]: next };
    });
  }
  function addOneByKey(line: UiLine) {
    if (line.product_id) {
      const p = products.find((x) => x.id === line.product_id);
      if (p) addOne(p);
      return;
    }
    setFreeLines((f) =>
      f.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l)),
    );
  }
  function removeOne(line: UiLine) {
    if (line.product_id) {
      const id = line.product_id;
      setCart((c) => {
        const next = (c[id] ?? 0) - 1;
        const copy = { ...c };
        if (next <= 0) delete copy[id];
        else copy[id] = next;
        return copy;
      });
      return;
    }
    setFreeLines((f) =>
      f
        .map((l) => (l.key === line.key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(line: UiLine) {
    if (line.product_id) {
      const id = line.product_id;
      setCart((c) => {
        const copy = { ...c };
        delete copy[id];
        return copy;
      });
      return;
    }
    setFreeLines((f) => f.filter((l) => l.key !== line.key));
  }

  // La page ouvre directement sur la grille et le panier. Un écran d'attente précédait
  // chaque vente (« Nouvelle commande ») : un geste de plus sur l'action la plus répétée
  // de la journée, pour un écran qui n'apprenait rien. L'état vide de la grille suffit.
  return (
    // `pb-20` dès qu'il y a quelque chose à encaisser : la barre de résumé est en `fixed`
    // et ne pousse rien, elle recouvrirait sinon le dernier produit de la grille.
    <div
      className={cn(
        "mx-auto max-w-7xl space-y-4 px-4 py-4",
        compact && (activeTable !== null || lines.length > 0) && "pb-20",
      )}
    >
      {/* Barre du jour. Absente tant qu'aucune vente n'est encaissée : rien à clôturer.
          Ensuite elle tient le total courant sous les yeux du serveur et porte la clôture
          de fin de service — finir la journée ne demande plus de changer d'écran. */}
      {salesToday.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Aujourd'hui</span>
            <span className="font-bold tabular-nums">{formatFCFA(todayTotal)}</span>
            <span className="text-muted-foreground">
              · {salesToday.length} vente{salesToday.length > 1 ? "s" : ""}
            </span>
          </span>
          <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
            <Lock className="h-4 w-4 mr-1" /> Clôturer la journée
          </Button>
        </div>
      )}

      {/* Plan de salle. Toutes les tables sont là, occupées ou non, TOUJOURS à la même
          place : c'est ce qui permet de lire l'état du service d'un coup d'œil au lieu de
          chercher un nom dans une liste qui bouge. Un tap sur une table libre l'ouvre
          directement, un appui long sur une table occupée la libère.
          Masqué pour un commerce sans système de tables (snack/bar) : la caisse se réduit
          alors au comptoir et à l'encaissement immédiat. */}
      {tablesEnabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
            {floorPlan.map(({ label, table }) => (
              <TableCard
                key={label}
                label={label}
                table={table}
                active={activeTable?.table === label}
                disabled={openMut.isPending || closeMut.isPending}
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
              le code. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border" />
              Libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" />
              Commande à prendre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              En service
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-info" />
              Encaissée en partie
            </span>
          </div>
          {/* Le geste est invisible sans ce rappel, et il n'existe qu'une fois qu'une table
              est occupée : afficher la phrase en permanence apprendrait un geste inutile. */}
          {openTables.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Appui long sur une table occupée pour la libérer.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* Products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-bold">Articles</h2>
            <div className="flex gap-1 flex-wrap">
              <FilterChip active={filter === "Tous"} onClick={() => setFilter("Tous")}>
                Tous
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
                  {c}
                </FilterChip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const inCart = cart[p.id] ?? 0;
              const out = Number.isFinite(p.stock) && p.stock - inCart <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => addOne(p)}
                  disabled={out}
                  className={cn(
                    "relative rounded-xl border bg-card p-4 text-left min-h-[100px] transition-all",
                    "hover:border-primary hover:shadow-md active:scale-[0.98]",
                    out && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="font-semibold leading-tight">{p.name}</div>
                  <div className="mt-1 text-lg font-bold text-primary">{formatFCFA(p.price)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Stock : {Number.isFinite(p.stock) ? p.stock - inCart : "∞"}
                  </div>
                  {inCart > 0 && (
                    <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow">
                      {inCart}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {products.length === 0 && (
            // Catalogue vide : c'est le tout premier lancement, et la main est déjà ici.
            // Créer le premier produit sans quitter la caisse évite au nouveau commerçant
            // de chercher l'écran Stocks au moment où il n'a encore rien à vendre.
            <Card>
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
                  <ProductForm editing={null} onClose={() => setCreateOpen(false)} />
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
          )}
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
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setFreeOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Article manuel
              </Button>

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
                      <motion.div
                        key={l.key}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{l.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFCFA(l.price)} × {l.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => removeOne(l)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-semibold">{l.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => addOneByKey(l)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeLine(l)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <div className="w-20 text-right font-semibold">
                          {formatFCFA(l.price * l.quantity)}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-lg font-semibold">{activeTable ? "Tournée" : "Total"}</span>
                <span className="text-3xl font-bold text-primary tabular-nums">
                  {formatFCFA(total)}
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
                      className="h-8 w-8"
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
                      className="h-8 w-8"
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

          {/* Encaissement. Au comptoir il est toujours là — c'est le geste unique. Sur une
              table il n'apparaît qu'après avoir choisi sa cible — « Encaisser » pour toute
              l'addition, « Encaisser cette tournée » pour une seule — pour que « ajouter
              une tournée » et « faire payer » ne se ressemblent jamais pendant un service. */}
          {(!activeTable || cashing) && (
            <>
              {cashing?.kind === "round" && cashingRound && (
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
                  Montant insuffisant. Demander au moins {formatFCFA(dueNow)}.
                </p>
              )}
            </>
          )}

          {/* Action principale. Son libellé dit exactement ce qui va se passer : ajouter
              une tournée n'engage pas d'argent, encaisser clôt l'addition. */}
          {!activeTable ? (
            <Button
              size="lg"
              className="w-full h-16 text-lg gap-2"
              disabled={!canValidate || saleMut.isPending}
              onClick={() => saleMut.mutate()}
            >
              <CheckCircle2 className="h-5 w-5" />
              Valider la vente
            </Button>
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
                    : payMut.mutate(activeTable.id)
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
                onClick={() => roundMut.mutate(activeTable.id)}
              >
                <Plus className="h-5 w-5" />
                Ajouter à la table {activeTable.table}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 gap-2"
                disabled={activeTable.total <= 0}
                onClick={() => setCashing({ kind: "table" })}
              >
                <CheckCircle2 className="h-4 w-4" />
                Encaisser {formatFCFA(activeTable.total)}
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
          // Posée AU-DESSUS de la barre d'onglets, pas par-dessus : `3.5rem` est la
          // hauteur des onglets (`min-h-[56px]` dans src/components/Nav.tsx) et
          // `env(safe-area-inset-bottom)` la marge que cette barre s'ajoute. Changer la
          // hauteur des onglets oblige à changer ce calcul.
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 border-t bg-primary px-4 py-2.5 text-primary-foreground shadow-lg"
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

      <FreeLineDialog
        open={freeOpen}
        onOpenChange={setFreeOpen}
        onAdd={(l) => setFreeLines((f) => [...f, l])}
      />

      <CloseDayDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        salesCount={salesToday.length}
        total={todayTotal}
        busy={closeDayMut.isPending}
        onConfirm={() => closeDayMut.mutate()}
      />

      <Dialog open={cancelPinOpen} onOpenChange={setCancelPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la table {activeTable?.table} ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Toute l'addition est supprimée et le stock des articles servis est restauré. Entrez le
              code PIN pour confirmer.
            </p>
            <div>
              <Label htmlFor="table-pin">Code PIN</Label>
              <Input
                id="table-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelPinOpen(false)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              disabled={cancelTableMut.isPending}
              onClick={() => {
                if (!verifyPin(pin)) {
                  toast.error("Code PIN incorrect");
                  return;
                }
                if (activeTable) cancelTableMut.mutate(activeTable.id);
              }}
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Contenant du panier : panneau latéral collant sur grand écran, feuille coulissante sur
 * téléphone.
 *
 * Les enfants ne sont rendus QU'UNE FOIS, dans l'un ou l'autre — d'où le test JavaScript
 * plutôt que deux blocs alternés par CSS. Un double rendu dupliquerait les `id` des
 * champs (`cash-given`, `table-pin`), et `document.getElementById` comme les `<label for>`
 * désigneraient alors le mauvais.
 */
function CartShell({
  compact,
  open,
  onOpenChange,
  children,
}: {
  compact: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  if (!compact) {
    return (
      <Card className="lg:sticky lg:top-20 h-fit">
        <CardContent className="space-y-4 p-4">{children}</CardContent>
      </Card>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="sr-only">Panier et encaissement</DrawerTitle>
        {/* `max-h` et non `h` : une addition d'une seule tournée ne doit pas ouvrir une
            feuille pleine hauteur. Le défilement est interne, la poignée reste visible. */}
        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Prochain libellé du plan de salle : « 7 » après 1–6. Les libellés non numériques
 *  (« Terrasse ») gardent leur place mais ne comptent pas dans la numérotation. */
function nextTableLabel(labels: string[]): string {
  const max = labels.reduce((m, l) => (/^\d+$/.test(l) ? Math.max(m, Number(l)) : m), 0);
  return String(max + 1);
}

/** Durée d'un appui long, en ms. En dessous, un tap un peu lent libérerait une table. */
const LONG_PRESS_MS = 500;

/**
 * Étape d'une table, lue sur les données existantes — aucun geste supplémentaire.
 *
 *  - "libre"    : aucune addition ouverte.
 *  - "awaiting" : table ouverte, rien de servi (`total === 0`) — la commande n'est pas
 *                 encore prise, c'est l'étape la plus urgente du service.
 *  - "service"  : table ouverte avec du service (`total > 0`) — le travail de la table
 *                 est en cours, du stock est sorti et de l'argent est dû.
 *  - "paid"     : table ouverte dont au moins une TOURNÉE a déjà été encaissée
 *                 (`rounds_paid` posé par `payRound`) — l'argent entre au passage, la
 *                 table reste ouverte sur ce qui reste dû. C'est la différence demandée :
 *                 distinguer une table qui a déjà encaissé d'une table servie mais dont
 *                 rien n'a encore été payé.
 *
 * Chaque étape a sa couleur sur le plan de salle, expliquée par la légende : libre est
 * neutre, « commande à prendre » est ambre, « en service » est la couleur de marque,
 * « déjà encaissée » est bleue.
 */
type TableStage = "libre" | "awaiting" | "service" | "paid";

function tableStage(table: Sale | null): TableStage {
  if (!table) return "libre";
  if ((table.rounds_paid ?? 0) > 0) return "paid";
  return table.total > 0 ? "service" : "awaiting";
}

/**
 * Une table du plan de salle.
 *
 * Libre ou occupée, la carte garde la même taille et la même place : c'est ce qui rend la
 * grille lisible sans la relire. L'état passe par la couleur, le montant et le point —
 * pas par la position.
 */
function TableCard({
  label,
  table,
  active,
  disabled,
  onClick,
  onLongPress,
}: {
  label: string;
  table: Sale | null;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  onLongPress?: () => void;
}) {
  const stage = tableStage(table);
  // `busy` sert aussi de narrowing : TypeScript ne sait pas déduire `table` depuis
  // `stage`, il sait depuis `busy`.
  const busy = table !== null;
  const timer = useRef<number | null>(null);
  // Le `pointerup` qui suit un appui long déclenche aussi le `click` : sans ce drapeau,
  // libérer une table la rouvrirait dans la foulée.
  const fired = useRef(false);

  function stop() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (fired.current) return;
        onClick();
      }}
      onPointerDown={() => {
        fired.current = false;
        if (!onLongPress) return;
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Sur téléphone, un appui long ouvre sinon le menu contextuel du navigateur
      // par-dessus le plan de salle.
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      aria-pressed={active}
      aria-label={
        !busy
          ? `Table ${label}, libre`
          : stage === "awaiting"
            ? `Table ${label}, ouverte, en attente de commande`
            : stage === "paid"
              ? table.total > 0
                ? `Table ${label}, partiellement encaissée, ${formatFCFA(table.total)} restants`
                : `Table ${label}, réglée. Appui long pour libérer.`
              : `Table ${label}, ${formatFCFA(table.total)} en cours. Appui long pour libérer.`
      }
      className={cn(
        "select-none [-webkit-touch-callout:none]",
        // Hauteur mesurée, pas généreuse : sept tables font déjà trois rangées sur un
        // téléphone, et chaque pixel pris ici repousse la grille d'articles — l'écran que
        // le serveur touche le plus souvent.
        "flex min-h-[64px] flex-col rounded-lg border px-2 py-1.5 text-left transition-all",
        "hover:border-primary active:scale-[0.98] disabled:opacity-60",
        stage === "libre" && "bg-card",
        stage === "awaiting" && "border-warning/60 bg-warning/15",
        stage === "service" && "border-primary/40 bg-accent",
        stage === "paid" && "border-info/60 bg-info/15",
        active && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-semibold leading-tight">{label}</span>
        {stage !== "libre" && (
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              stage === "awaiting" ? "bg-warning" : stage === "paid" ? "bg-info" : "bg-primary",
            )}
          />
        )}
      </span>
      {!busy ? (
        <span className="text-xs leading-tight text-muted-foreground">libre</span>
      ) : stage === "awaiting" ? (
        <>
          <span className="font-bold leading-tight text-warning tabular-nums">commande</span>
          <span className="mt-auto text-[11px] leading-tight text-muted-foreground">
            {table.opened_at ? formatTime(table.opened_at) : "occupée"}
          </span>
        </>
      ) : stage === "paid" && table.total <= 0 ? (
        <>
          <span className="font-bold leading-tight text-info tabular-nums">réglée</span>
          <span className="mt-auto text-[11px] leading-tight text-muted-foreground">
            {table.opened_at ? formatTime(table.opened_at) : "occupée"}
          </span>
        </>
      ) : stage === "paid" ? (
        <>
          <span className="font-bold leading-tight text-info tabular-nums">
            {formatFCFA(table.total)}
          </span>
          <span className="mt-auto text-[11px] leading-tight text-muted-foreground">
            encaissée · {table.opened_at ? formatTime(table.opened_at) : "occupée"}
          </span>
        </>
      ) : (
        <>
          <span className="font-bold leading-tight text-primary tabular-nums">
            {formatFCFA(table.total)}
          </span>
          <span className="mt-auto text-[11px] leading-tight text-muted-foreground">
            {table.opened_at ? formatTime(table.opened_at) : "occupée"}
          </span>
        </>
      )}
    </button>
  );
}

/** Pastille de destination : le comptoir, ou une table ouverte avec son addition. */
function TargetChip({
  active,
  onClick,
  icon: Icon,
  label,
  amount,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Store;
  label: string;
  amount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-primary hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {amount !== undefined && amount > 0 && (
        <span className={cn("tabular-nums", active ? "opacity-90" : "text-muted-foreground")}>
          · {formatFCFA(amount)}
        </span>
      )}
    </button>
  );
}

function FreeLineDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (line: FreeLine) => void;
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState<Category>("Boisson");

  function reset() {
    setName("");
    setCost("");
    setPrice("");
    setQuantity("1");
    setCategory("Boisson");
  }

  function submit() {
    const label = name.trim();
    if (!label) {
      toast.error("Libellé requis");
      return;
    }
    if ((Number(price) || 0) <= 0) {
      toast.error("Prix de vente invalide");
      return;
    }
    onAdd({
      key: `libre_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: label,
      cost: Number(cost) || 0,
      price: Number(price),
      category,
      quantity: Math.max(1, Number(quantity) || 1),
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Article manuel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="free-name">Libellé</Label>
            <Input
              id="free-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Regab"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="free-cost">Prix d'achat</Label>
              <Input
                id="free-cost"
                inputMode="numeric"
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
                placeholder="200"
              />
            </div>
            <div>
              <Label htmlFor="free-price">Prix de vente</Label>
              <Input
                id="free-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="300"
              />
            </div>
            <div>
              <Label htmlFor="free-qty">Quantité</Label>
              <Input
                id="free-qty"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                placeholder="1"
              />
            </div>
          </div>
          <div>
            <Label>Catégorie</Label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>
          <p className="text-xs text-muted-foreground">
            Sans prix d'achat, cette vente comptera entièrement comme bénéfice dans les rapports.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit}>Ajouter au panier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // `min-h-11` = 44 px, le minimum tactile. Une pastille de 30 px se manque une fois
        // sur trois avec un pouce, et ces filtres se touchent en plein service.
        "min-h-11 rounded-full border px-4 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
