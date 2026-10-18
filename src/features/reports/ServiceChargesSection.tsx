import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import type { ServiceChargeLine } from "@/lib/reports/charges-by-period";

/**
 * Charges de SERVICE : une ligne par catégorie de prestation VENDUE sur la période.
 *
 * La liste vient des VENTES, plus du catalogue (redécision de l'ancien design) :
 * une catégorie sans prestation vendue n'a rien à charger sur la période — l'onglet
 * Bénéfice s'ouvre sur ce qui a tourné. Le commerçant saisit ici ce que lui coûte une
 * catégorie qui a servi (le loyer du salon, les produits de la coiffure) — pas un coût
 * unitaire, qu'il saisit sur la fiche quand il le connaît.
 *
 * Pas de bouton « Modifier » ni de dialogue : chaque ligne est DÉJÀ un champ, la
 * sauvegarde passe au blur. « Supprimer » non plus : vider le montant supprime la charge
 * immédiatement — un geste, un effort ; le même geste qu'un bouton.
 *
 * PRESENTATION pure — la sauvegarde et la suppression passent par des props ; l'accès
 * base appartient à l'écran hôte (`ProfitTab`).
 */
export function ServiceChargesSection({
  categories,
  services,
  categoryRevenue,
  onSave,
  onRemove,
}: {
  /** Catégories où au moins UNE prestation a été vendue sur la période. */
  categories: string[];
  /** Charges déjà enregistrées sur la période, groupées par catégorie. */
  services: ServiceChargeLine[];
  /** CA de la période par catégorie — même source que les noms, donc le recoupement tient. */
  categoryRevenue: Record<string, number>;
  onSave: (category: string, amount: number, id?: string) => void;
  onRemove: (id: string) => void;
}) {
  // Ce qui pèse d'abord ; toutes les catégories listées ont vendu, la marge est juste
  // une question d'ordre d'affichage.
  const rows = [...categories].sort(
    (a, b) => (categoryRevenue[b] ?? 0) - (categoryRevenue[a] ?? 0),
  );
  const parCategorie = new Map(services.map((s) => [s.category, s]));

  if (rows.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Charges de service</h3>
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Aucune prestation vendue sur la période
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Charges de service</h3>
      {rows.map((category) => {
        const existante = parCategorie.get(category);
        const ca = categoryRevenue[category] ?? 0;
        return (
          <div key={category} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{category}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {`CA ${formatFCFA(ca)}`}
            </span>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={existante && existante.amount > 0 ? String(existante.amount) : ""}
              placeholder="—"
              aria-label={`Coût de la catégorie ${category}`}
              className="h-9 w-32 text-right tabular-nums"
              onBlur={(e) => {
                const raw = e.target.value.trim();

                // Champ VIDÉ : suppression immédiate de la charge. Un geste, un effet —
                // jamais « enregistrer 0 puis nettoyer plus tard ».
                if (raw === "") {
                  if (existante) onRemove(existante.id);
                  return;
                }

                const amount = Number(raw);
                if (Number.isNaN(amount) || amount < 0) {
                  // Frappe illisible : on restaure, on ne détruit rien.
                  e.target.value = existante?.amount ? String(existante.amount) : "";
                  return;
                }
                // Réécrit si elle existe : une seule charge par catégorie et par période,
                // jamais une seconde ligne pour la même catégorie.
                if (amount !== (existante?.amount ?? 0)) {
                  onSave(category, amount, existante?.id);
                }
              }}
            />
          </div>
        );
      })}
    </section>
  );
}
