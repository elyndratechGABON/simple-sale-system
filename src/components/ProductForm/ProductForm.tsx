// Formulaire de création / édition d'un produit. Partagé entre l'écran Stocks et la
// caisse (catalogue vide → créer le premier produit sans changer d'écran).
//
// Le composant gère lui-même sa mutation et son invalidation : ses deux hôtes n'ont
// qu'à le monter dans un `Dialog` et lui donner un `onClose`.
import { Package } from "lucide-react";
import type { Category, Product } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductFormFields } from "./ProductFormFields";
import { useProductForm } from "./useProductForm";

export function ProductForm({
  editing,
  onClose,
  defaultCategory,
  defaultType,
}: {
  editing: Product | null;
  onClose: () => void;
  defaultCategory?: Category;
  defaultType?: "product" | "service";
}) {
  const form = useProductForm({ editing, onClose, defaultCategory, defaultType });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-4 py-0 sm:px-0">
      {/* Titre et footer STICKY : sur un écran petit, le formulaire peut éventuellement
          scroller — le vendeur garde alors le titre ET le CTA en portée de regard. */}
      <DialogHeader className="sticky top-0 z-10 rounded-t-xl bg-background px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold text-foreground">
              {editing ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Renseignez les informations essentielles.
            </p>
          </div>
        </div>
      </DialogHeader>
      <div className="px-4 sm:px-6">
        <ProductFormFields form={form} />
      </div>
      <DialogFooter className="sticky bottom-0 z-10 mt-0 border-t bg-background px-4 py-3 sm:px-6">
        <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto h-10">
          Annuler
        </Button>
        <Button
          onClick={() => form.saveMut.mutate()}
          disabled={form.saveMut.isPending}
          className="w-full sm:w-auto h-10 rounded-lg"
        >
          {form.saveMut.isPending
            ? "Enregistrement…"
            : editing
              ? "Enregistrer les modifications"
              : "Enregistrer le produit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
