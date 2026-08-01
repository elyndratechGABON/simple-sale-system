import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle2, X } from "lucide-react";
import {
  CATEGORIES,
  createSale,
  listProducts,
  type CartLine,
  type Category,
  type Product,
} from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pos")({
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

function PosPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  const [active, setActive] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [freeLines, setFreeLines] = useState<FreeLine[]>([]);
  const [freeOpen, setFreeOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>("");
  const [filter, setFilter] = useState<Category | "Tous">("Tous");
  // Nombre de personnes servies par cette vente. Alimente le KPI « clients » des
  // rapports. Reste à 1 dans le cas courant — un client, une vente.
  const [customers, setCustomers] = useState(1);

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

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const cash = Number(cashGiven) || 0;
  const change = cash - total;
  const insufficient = cash > 0 && change < 0;
  const canValidate = lines.length > 0 && cash >= total && total > 0;

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
      resetSale();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetSale() {
    setCart({});
    setFreeLines([]);
    setCashGiven("");
    setCustomers(1);
    setActive(false);
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

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Caisse</h1>
          <p className="text-muted-foreground">Démarrez une commande pour encaisser un client.</p>
        </div>
        <Button
          size="lg"
          className="h-24 w-full max-w-md text-2xl gap-3 shadow-lg"
          onClick={() => setActive(true)}
        >
          <Plus className="h-8 w-8" />
          Nouvelle commande
        </Button>
        {products.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Aucun produit enregistré — vous pouvez quand même encaisser en saisissant les articles à
            la main.{" "}
            <Link to="/stocks" className="text-primary underline">
              Ajouter des produits
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 grid gap-4 lg:grid-cols-[1fr_400px]">
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
          <p className="text-sm text-muted-foreground">
            Aucun produit au catalogue. Utilisez « Article manuel » dans le panier pour saisir la
            vente à la main.
          </p>
        )}
      </div>

      {/* Cart / cash panel */}
      <Card className="lg:sticky lg:top-20 h-fit">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Panier
            </h2>
            <Button size="sm" variant="ghost" onClick={resetSale}>
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => setFreeOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Article manuel
          </Button>

          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ajoutez des articles depuis la grille ou saisissez-les à la main.
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
            <span className="text-lg font-semibold">Total</span>
            <span className="text-3xl font-bold text-primary">{formatFCFA(total)}</span>
          </div>

          {/* Discret à dessein : le cas courant est « 1 client » et ne doit demander
              aucun geste. Seule une table de plusieurs personnes fait toucher aux +/−. */}
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Argent donné</label>
            <Input
              inputMode="numeric"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="h-14 text-2xl text-right font-bold"
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
            <span className="font-semibold">{insufficient ? "Manque" : "Monnaie à rendre"}</span>
            <span
              className={cn(
                "text-3xl font-bold",
                insufficient ? "text-destructive" : "text-primary",
              )}
            >
              {formatFCFA(Math.abs(change))}
            </span>
          </div>
          {insufficient && (
            <p className="text-sm text-destructive">
              Montant insuffisant. Demander au moins {formatFCFA(total)}.
            </p>
          )}

          <Button
            size="lg"
            className="w-full h-16 text-lg gap-2"
            disabled={!canValidate || saleMut.isPending}
            onClick={() => saleMut.mutate()}
          >
            <CheckCircle2 className="h-5 w-5" />
            Valider la vente
          </Button>
        </CardContent>
      </Card>

      <FreeLineDialog
        open={freeOpen}
        onOpenChange={setFreeOpen}
        onAdd={(l) => setFreeLines((f) => [...f, l])}
      />
    </div>
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
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        "px-3 py-1 rounded-full text-sm border transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
