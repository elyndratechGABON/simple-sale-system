import { useState } from "react";
import { Plus, X, Utensils, CreditCard, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import type { Sale } from "@/lib/db";
import type { PosController } from "@/features/pos/usePos";

interface TablePopupProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableLabel: string;
  sale: Sale | null;
  pos: PosController;
}

export function TablePopup({ open, onOpenChange, tableLabel, sale, pos }: TablePopupProps) {
  const [search, setSearch] = useState("");
  const total = sale?.total ?? 0;
  const filteredProducts = pos.products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" /> {tableLabel}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {sale && total > 0 && (
            <div className="text-right text-lg font-bold text-primary">
              Total : {formatFCFA(sale.total)}
            </div>
          )}
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Produits à gauche */}
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Produits</h3>
            </div>
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pos.products
                .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.variants && p.variants.length > 0) {
                        pos.setVariantPicker({ product: p });
                        return;
                      }
                      pos.addOne(p);
                    }}
                    disabled={pos.roundMut.isPending}
                    className="group flex flex-col items-start gap-1.5 rounded-lg border bg-card p-2 hover:border-primary hover:bg-accent/50 transition-colors"
                  >
                    <span className="font-medium text-sm truncate w-full">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.category}</span>
                    <span className="mt-auto font-bold text-primary tabular-nums">
                      {formatFCFA(p.price)}
                    </span>
                    <Plus className="absolute bottom-2 right-2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
                  </button>
                ))}
            </div>
          </div>

          {/* Détail de la table à droite */}
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {sale ? "Addition en cours" : "Nouvelle addition"}
              </h3>
              {sale && sale.total > 0 && (
                <div className="text-right font-bold text-primary tabular-nums">
                  {formatFCFA(sale.total)}
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center py-4">
              {sale && sale.total > 0
                ? "Articles servis — ajoutez-en d'autres"
                : "Ajoutez un produit pour ouvrir l'addition"}
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t">
              {!sale && (
                <Button
                  className="w-full"
                  onClick={() => pos.setTablePopupOpen(false)}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" /> Annuler
                </Button>
              )}
              {sale && sale.total > 0 && (
                <Button className="w-full" onClick={() => pos.setCashing({ kind: "table" })}>
                  <CreditCard className="h-4 w-4 mr-2" /> Encaisser {formatFCFA(sale.total)}
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => pos.setOrdersOpen(true)}>
                <Utensils className="h-4 w-4 mr-2" /> Voir les commandes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
