import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import {
  CATEGORIES,
  addProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type Category,
  type Product,
} from "@/lib/db";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/stocks")({
  head: () => ({
    meta: [
      { title: "Stocks & Produits — Caisse POS" },
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
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" /> Stocks & Produits
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez et mettez à jour vos articles avant de vendre.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
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
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
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
                      {p.cost > 0 && <>Achat {formatFCFA(p.cost)} · </>}
                      Vente {formatFCFA(p.price)}
                      {p.cost > 0 && <> · Marge {formatFCFA(p.price - p.cost)}</>} · Stock&nbsp;:{" "}
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
                        setOpen(true);
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

function ProductForm({ editing, onClose }: { editing: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [cost, setCost] = useState<string>(editing?.cost ? String(editing.cost) : "");
  const [price, setPrice] = useState<string>(editing ? String(editing.price) : "");
  const [unlimited, setUnlimited] = useState(editing ? !Number.isFinite(editing.stock) : false);
  const [stock, setStock] = useState<string>(
    editing && Number.isFinite(editing.stock) ? String(editing.stock) : "",
  );
  const [category, setCategory] = useState<Category>(editing?.category ?? "Boisson");

  const saveMut = useMutation({
    mutationFn: async () => {
      const p = {
        name: name.trim(),
        cost: Number(cost) || 0,
        price: Number(price) || 0,
        stock: unlimited ? Number.POSITIVE_INFINITY : Number(stock) || 0,
        category,
      };
      if (!p.name) throw new Error("Nom requis");
      if (p.price <= 0) throw new Error("Prix invalide");
      if (editing) {
        await updateProduct({ ...editing, ...p });
      } else {
        await addProduct(p);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Produit mis à jour" : "Produit ajouté");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Regab"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="cost">Prix d'achat</Label>
            <Input
              id="cost"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
              placeholder="200"
            />
          </div>
          <div>
            <Label htmlFor="price">Prix de vente</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="300"
            />
          </div>
          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
              placeholder="50"
              disabled={unlimited}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="unlimited"
            checked={unlimited}
            onCheckedChange={(v) => setUnlimited(Boolean(v))}
          />
          <Label htmlFor="unlimited" className="cursor-pointer">
            Stock illimité (service)
          </Label>
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
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
