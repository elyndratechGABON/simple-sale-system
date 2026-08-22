import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, PackagePlus, Search, Minus } from "lucide-react";
import { addStock, deleteProduct, listProducts, type Product } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
        content: "Ajoutez et gérez vos produits, prix et stocks.",
      },
    ],
  }),
  component: StocksPage,
});

function StocksPage() {
  const qc = useQueryClient();
  const { isService } = useClusterFeatures();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [prestationOpen, setPrestationOpen] = useState(false);

  // ── Ajout de stock manuel ──────────────────────────────────────────────────
  const [stockOpen, setStockOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string>("");
  const [addQty, setAddQty] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const selectedProduct = products.find((p) => p.id === stockProductId) ?? null;

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

  const QUICK_QTYS = [1, 5, 10, 50];

  const addStockMut = useMutation({
    mutationFn: () => {
      if (!selectedProduct) throw new Error("Sélectionnez un produit.");
      const qty = Number(addQty) || 0;
      if (qty <= 0) throw new Error("Quantité invalide.");
      return addStock(selectedProduct.id, qty);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${updated.name} : +${addQty} (total ${updated.stock})`);
      setStockOpen(false);
      setStockProductId("");
      setAddQty("");
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

  const grouped = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      (map[p.category] ??= []).push(p);
    }
    return map;
  }, [products]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" /> Stocks & Produits
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez et mettez à jour vos articles avant de vendre.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={stockOpen}
            onOpenChange={(v) => {
              setStockOpen(v);
              if (!v) {
                setStockProductId("");
                setAddQty("");
                setStockSearch("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                <PackagePlus className="h-5 w-5 mr-1" /> Ajouter du stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter du stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Recherche */}
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

                {/* Grille de produits */}
                {!selectedProduct ? (
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
                            variant={p.stock <= 5 ? "destructive" : "secondary"}
                            className="ml-2 shrink-0 tabular-nums"
                          >
                            Stock : {p.stock}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    {/* Produit sélectionné */}
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

                    {/* Quantité */}
                    <div>
                      <Label htmlFor="add-qty">Quantité à ajouter</Label>
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
                    </div>

                    {/* Boutons rapides */}
                    <div className="flex gap-2">
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

                    {/* Preview total */}
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Nouveau total</p>
                      <p className="text-xl font-bold tabular-nums">
                        {selectedProduct.stock + (Number(addQty) || 0)}
                      </p>
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

          <Dialog
            open={editOpen}
            onOpenChange={(v) => {
              setEditOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setEditing(null)}>
                <Plus className="h-5 w-5 mr-1" /> Nouveau produit
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
            <Dialog
              open={prestationOpen}
              onOpenChange={(v) => {
                setPrestationOpen(v);
                if (!v) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" onClick={() => setEditing(null)}>
                  <Plus className="h-5 w-5 mr-1" /> Nouvelle prestation
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
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {items.length}
                </span>
                {cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {items.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3.5 gap-3 group">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    {p.photo ? (
                      <img
                        src={p.photo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md border object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <span>{formatFCFA(p.price)}</span>
                        <span className="text-border">·</span>
                        <span>
                          Stock&nbsp;:&nbsp;
                          <span
                            className={cn(
                              "font-medium",
                              Number.isFinite(p.stock) && p.stock <= 5
                                ? "text-destructive"
                                : "text-foreground",
                            )}
                          >
                            {Number.isFinite(p.stock) ? p.stock : "∞"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing(p);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`Supprimer "${p.name}" ?`)) {
                          removeMut.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
