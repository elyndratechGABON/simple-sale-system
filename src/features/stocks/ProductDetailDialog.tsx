import { Package, PackagePlus, Pencil } from "lucide-react";
import type { Product } from "@/lib/db";
import { formatFCFA, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MovementList } from "./Movements";
import { marginLabel, stateOf, thresholdOf } from "./stock-state";

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

/** Fiche produit compacte : infos clés, historique récent, actions rapides. */
export function ProductDetailDialog({
  product,
  lastSoldAt,
  onClose,
  onAddStock,
  onEdit,
}: {
  product: Product | null;
  lastSoldAt?: number;
  onClose: () => void;
  onAddStock: (p: Product) => void;
  onEdit: (p: Product) => void;
}) {
  return (
    <Dialog open={product !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {product && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {product.photo ? (
                  <img
                    src={product.photo}
                    alt=""
                    className="h-12 w-12 rounded-lg border object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 truncate">{product.name}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <InfoCell label="Catégorie" value={product.category} />
                <InfoCell label="Prix de vente" value={formatFCFA(product.price)} />
                <InfoCell
                  label="Prix d'achat"
                  value={product.cost > 0 ? formatFCFA(product.cost) : "Non saisi"}
                />
                <InfoCell label="Marge" value={marginLabel(product)} />
                {stateOf(product) === "service" ? (
                  <InfoCell label="Type" value="Service — sans stock" />
                ) : (
                  <>
                    <InfoCell label="Stock actuel" value={String(product.stock)} />
                    <InfoCell
                      label="Seuil d'alerte"
                      value={`${thresholdOf(product)}${
                        typeof product.min_stock === "number" ? "" : " (défaut)"
                      }`}
                    />
                    {/* Réponse directe au « il y a 1 j, il y a 3 j » : dernière vente
                      connue sur les 30 derniers jours. */}
                    <InfoCell
                      label="Dernière vente"
                      value={
                        lastSoldAt !== undefined ? formatRelative(lastSoldAt) : "Aucune sur 30 j"
                      }
                    />
                  </>
                )}
              </div>

              <MovementList
                productId={product.id}
                limit={10}
                emptyLabel="Aucun mouvement enregistré pour ce produit."
              />

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const p = product;
                    onClose();
                    onAddStock(p);
                  }}
                >
                  <PackagePlus className="h-4 w-4 mr-1.5" /> Ajouter du stock
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const p = product;
                    onClose();
                    onEdit(p);
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
  );
}
