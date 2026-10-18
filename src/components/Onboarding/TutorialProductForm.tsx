import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/db";
import { ProductFormFields } from "@/components/ProductForm/ProductFormFields";
import { useProductForm } from "@/components/ProductForm/useProductForm";
import { StepShell } from "./StepShell";
import type { ClusterTutorialApi } from "./useClusterTutorial";

/**
 * Étape « premier produit » de l'onboarding — la COQUILLE seulement.
 * Les champs, le sélecteur produit/service et la sauvegarde sont ceux de
 * `ProductFormFields` / `useProductForm` : identiques à l'onglet Stocks.
 */
export function TutorialProductForm({ t }: { t: ClusterTutorialApi }) {
  // Remonte après chaque sauvegarde : le hook réinitialise tous ses `useState`.
  const [seq, setSeq] = useState(0);
  return (
    <TutorialProductFields
      key={seq}
      t={t}
      onSaved={() => {
        t.setAddedCount((c) => c + 1);
        setSeq((s) => s + 1);
      }}
    />
  );
}

function TutorialProductFields({ t, onSaved }: { t: ClusterTutorialApi; onSaved: () => void }) {
  const form = useProductForm({
    editing: null,
    onClose: () => {},
    defaultCategory: t.isServiceCluster ? "Beauté" : ("" as Category),
    defaultType: "product",
    onSaved,
  });

  // Titre et description suivant le type choisi DANS le formulaire unifié —
  // l'ancien `addingProduct` de l'onboarding, mis à jour par le vrai champ.
  const isService = form.productType === "service";
  const title = isService
    ? t.isServiceCluster
      ? t.tutorialConfig.addTitle
      : "Ajoutez une prestation"
    : t.isServiceCluster
      ? "Ajoutez un produit à vendre"
      : t.tutorialConfig.addTitle;
  const description = isService
    ? t.isServiceCluster
      ? t.tutorialConfig.addDescription
      : "Nom et prix de la prestation — sans stock."
    : t.isServiceCluster
      ? "Shampooings, huiles, cosmétiques… vendus en boutique, avec stock."
      : t.tutorialConfig.addDescription;

  return (
    <StepShell icon={Package} title={title} description={description}>
      <ProductFormFields form={form} />
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button variant="ghost" size="sm" onClick={() => t.setSubStep("done")}>
          {t.addedCount > 0 ? "J'ai terminé" : "Passer"}
        </Button>
        <Button onClick={() => form.saveMut.mutate()} disabled={form.saveMut.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>
    </StepShell>
  );
}
