import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, PackagePlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "@/components/ProductForm";
import { useClusterFeatures } from "@/hooks/use-cluster-features";
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

  const selectedProduct = products.find((p) => p.id === stockProductId) ?? null;

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
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                <PackagePlus className="h-5 w-5 mr-1" /> Ajouter du stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter du stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Produit</Label>
                  <Select value={stockProductId} onValueChange={setStockProductId}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Choisir un produit…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter((p) => Number.isFinite(p.stock))
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — stock actuel : {p.stock}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProduct && (
                  <>
                    <div>
                      <Label htmlFor="add-qty">Quantité à ajouter</Label>
                      <Input
                        id="add-qty"
                        inputMode="numeric"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        autoFocus
                        className="h-12 text-lg font-bold"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && Number(addQty) > 0) addStockMut.mutate();
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nouveau total&nbsp;:{" "}
                      <span className="font-medium">
                        {selectedProduct.stock + (Number(addQty) || 0)}
                      </span>
                    </p>
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
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucun produit. Cliquez sur « Nouveau produit » pour commencer.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {cat}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Vente {formatFCFA(p.price)} · Stock&nbsp;:{" "}
                      <span
                        className={
                          Number.isFinite(p.stock) && p.stock <= 5
                            ? "text-destructive font-semibold"
                            : ""
                        }
                      >
                        {Number.isFinite(p.stock) ? p.stock : "∞"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(p);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Supprimer "${p.name}" ?`)) {
                          removeMut.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
