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
    <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[92vh] overflow-y-auto px-4 py-4 sm:px-6">
      <DialogHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {editing ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Renseignez les informations essentielles.
            </p>
          </div>
        </div>
      </DialogHeader>
      <ProductFormFields form={form} />
      <DialogFooter className="pt-4 border-t">
        <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
          Annuler
        </Button>
        <Button
          onClick={() => form.saveMut.mutate()}
          disabled={form.saveMut.isPending}
          className="w-full sm:w-auto h-11 rounded-lg"
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
