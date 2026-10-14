import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import type { ServiceChargeLine } from "@/lib/reports/charges-by-period";

/**
 * Charges de SERVICE : une ligne par catégorie de prestation du CATALOGUE.
 *
 * Le commerce saisit ici ce que lui coûte une catégorie à faire tourner par période
 * (le loyer du salon, les produits de la coiffure) — pas un coût unitaire, qu'il saisit
 * sur la fiche quand il le connaît.
 *
 * La liste vient du catalogue, PAS des charges enregistrées : une catégorie sans vente sur
 * la période s'affiche quand même, avec son input ACTIF. Le commerce peut vouloir saisir
 * son loyer du mois avant d'avoir servi la première prestation ; l'inverse — un champ qui
 * n'apparaît qu'après une vente — l'obligerait à revenir Plus tard et à le retrouver.
 *
 * « Supprimer » a disparu : vider le montant suffit, le dialogue efface les charges à 0 à
 * la fermeture. Un bouton de plus qui fait la même chose.
 *
 * PRESENTATION pure — la sauvegarde passe en props ; la périodicité et l'accès base
 * appartiennent au dialogue.
 */
export function ServiceChargesSection({
  allCategories,
  services,
  categoryRevenue,
  onSave,
}: {
  /** Catégories du catalogue portant au moins un produit `type: "service"`. */
  allCategories: string[];
  /** Charges déjà enregistrées sur la période, groupées par catégorie. */
  services: ServiceChargeLine[];
  /** CA de la période par catégorie — même source que les noms, donc le recoupement tient. */
  categoryRevenue: Record<string, number>;
  onSave: (category: string, amount: number, id?: string) => void;
}) {
  // Ce qui pèse d'abord ; une catégorie sans vente passe en fin de liste.
  const rows = [...allCategories].sort(
    (a, b) => (categoryRevenue[b] ?? 0) - (categoryRevenue[a] ?? 0),
  );
  const parCategorie = new Map(services.map((s) => [s.category, s]));

  if (rows.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Charges de service</h3>
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Aucune prestation au catalogue
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
              {ca > 0 ? `CA ${formatFCFA(ca)}` : "0 vente"}
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

                // Champ VIDÉ : intention de supprimer. On enregistre 0, et le dialogue
                // efface les charges à 0 à la fermeture. Le traiter comme une faute de
                // frappe rendait la suppression IMPOSSIBLE — c'est ce qui est arrivé.
                if (raw === "") {
                  if (existante && existante.amount !== 0) onSave(category, 0, existante.id);
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
