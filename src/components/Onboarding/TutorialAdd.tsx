import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClusterTutorialApi } from "./useClusterTutorial";
import { TutorialProductForm } from "./TutorialProductForm";

export function TutorialAdd({ t }: { t: ClusterTutorialApi }) {
  const addedLabel =
    t.addedCount === 1
      ? !t.tutorialConfig.isService
        ? "produit ajouté"
        : t.addingProduct
          ? "produit ajouté"
          : "prestation ajoutée"
      : !t.tutorialConfig.isService
        ? "produits ajoutés"
        : "prestations et produits ajoutés";

  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h1 className="sr-only">{t.addTitle}</h1>
      <div className="space-y-4 py-2">
        <TutorialProductForm t={t} />

        {t.addedCount > 0 && (
          <p className="text-center text-sm text-primary font-medium">
            ✓ {t.addedCount} {addedLabel}
          </p>
        )}

        <Button
          variant="default"
          size="lg"
          className="w-full gap-2"
          onClick={t.handleLoadDemo}
          disabled={t.loadingDemo}
        >
          {t.loadingDemo ? (
            "Chargement…"
          ) : (
            <>
              <Package className="h-4 w-4" /> Charger les produits de démo
            </>
          )}
        </Button>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => t.setSubStep("done")}>
            {t.addedCount > 0 ? "J'ai terminé" : "Passer"}
          </Button>
          <Button
            onClick={t.handleAddProduct}
            disabled={!t.productName.trim() || !t.productPrice.trim()}
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}
