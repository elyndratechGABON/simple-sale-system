import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { deleteProduct, listProducts, type Product } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "@/components/ProductForm";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/stocks")({
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
