import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteCharge, listCharges, saveCharge } from "@/lib/db";
import { groupChargesByKind } from "@/lib/reports/charges-by-period";
import { ServiceChargesSection } from "./ServiceChargesSection";
import { BusinessChargesSection } from "./BusinessChargesSection";

interface ChargesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bornes de la période affichée, exclusives à droite (`rangeFor`). */
  from: number;
  to: number;
  /** Catégories du catalogue portant au moins un produit `type: "service"`. */
  allCategories: string[];
  /** CA de la période par catégorie — même clé que les noms, sinon le recoupement échoue. */
  categoryRevenue: Record<string, number>;
}

/**
 * Saisie des charges de la période — services et business.
 *
 * PAS DE DIFF À LA VALIDATION : chaque ligne enregistre AU BLUR, comme les coûts produits.
 * Un diff « tout sauvegarder » ressusciterait les lignes supprimées et réécrirait des
 * montants inchangés, donc émettrait des opérations de synchronisation pour rien.
 *
 * PAS DE DOUBLON : « ajouter » cherche la charge existante de même catégorie (ou de même
 * poste) et RÉÉCRIT celle-ci en passant son `id` — jamais une seconde ligne.
 *
 * La query est invalidée par le préfixe `charges` de `invalidateSyncQueries` : une charge
 * reçue d'un autre écran pendant que le dialogue est ouvert s'affiche sans rechargement.
 *
 * NETTOYAGE : une ligne créée reste à 0 tant que le vendeur ne l'a pas remplie, faute de quoi
 * le bouton « + Ajouter » aurait pu créer une charge sans `id`, inenregistrable au blur
 * ensuite. À la fermeture, les charges à 0 sont donc supprimées : une ligne abandonnée
 * disparaît au lieu de s'accumuler. Conséquence assumée : une charge legitimately mise à
 * 0 disparaît aussi à la fermeture.
 */
export function ChargesDialog({
  open,
  onOpenChange,
  from,
  to,
  allCategories,
  categoryRevenue,
}: ChargesDialogProps) {
  const qc = useQueryClient();
  const { data: charges = [] } = useQuery({
    queryKey: ["charges", from, to],
    queryFn: () => listCharges(from, to),
    enabled: open,
  });
  const { services, business } = groupChargesByKind(charges);

  async function save(kind: "service" | "business", key: string, amount: number, id?: string) {
    try {
      await saveCharge({
        id,
        kind,
        ...(kind === "service" ? { category: key } : { label: key }),
        period_start: from,
        period_to: to,
        amount,
      });
      await qc.invalidateQueries({ queryKey: ["charges"] });
    } catch {
      toast.error("Charge non enregistrée.");
    }
  }

  async function remove(id: string) {
    try {
      await deleteCharge(id);
      await qc.invalidateQueries({ queryKey: ["charges"] });
    } catch {
      toast.error("Charge non supprimée.");
    }
  }

  /** Seule porte de sortie : croix, Échap et clic extérieur arrivent tous par là. */
  function close() {
    for (const charge of charges) {
      if (charge.amount === 0) void remove(charge.id);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charges de la période</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <ServiceChargesSection
            allCategories={allCategories}
            services={services}
            categoryRevenue={categoryRevenue}
            onSave={(category, amount, id) => void save("service", category, amount, id)}
            onRemove={(id) => void remove(id)}
          />

          <BusinessChargesSection
            business={business}
            onSave={(label, amount, id) => void save("business", label, amount, id)}
            onRemove={(id) => void remove(id)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
