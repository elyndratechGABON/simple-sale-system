import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import type { ServiceChargeLine } from "@/lib/reports/charges-by-period";
import type { ServiceSold } from "@/lib/reports/period-profit";

/**
 * Charges de SERVICE : une ligne par PRESTATION vendue sur la période, nommée.
 *
 * Redécision demandée par l'utilisateur : l'ancien affichage groupait par catégorie
 * (« Coiffure », un seul montant) — le commerçant ne voyait pas QUOI il avait vendu, et
 * ne savait pas quel coût entrer. Chaque ligne porte maintenant le nom de la prestation
 * (CA à côté pour situer le poids) : la saisie décrit ce que la prestation a coûté à
 * réaliser sur la période, pas un coût unitaire, qu'il saisit sur la fiche quand il le
 * connaît.
 *
 * La clé d'enregistrement est le NOM de la prestation (champ `category` de la charge —
 * compatibilité base et sync intactes ; une seule charge par prestation et par période,
 * la réécriture passe par son `id`). Les charges dont la clé ne correspond à aucune
 * prestation vendue (catégories saisies à l'ancien format) restent AFFICHÉES en fin de
 * liste : le bénéfice net les soustrait déjà, les cacher serait demander d'admettre un
 * chiffre qu'on ne voit nulle part.
 *
 * Pas de bouton « Modifier » ni de dialogue : chaque ligne est DÉJÀ un champ, la
 * sauvegarde passe au blur. « Supprimer » non plus : vider le montant supprime la charge
 * immédiatement — un geste, un effort ; le même geste qu'un bouton.
 *
 * PRESENTATION pure — la sauvegarde et la suppression passent par des props ; l'accès
 * base appartient à l'écran hôte (`ProfitTab`).
 */
export function ServiceChargesSection({
  sold,
  services,
  onSave,
  onRemove,
}: {
  /** Prestations vendues sur la période, avec leur CA — déjà triées par CA décroissant. */
  sold: ServiceSold[];
  /** Charges déjà enregistrées sur la période, de nature service. */
  services: ServiceChargeLine[];
  onSave: (name: string, amount: number, id?: string) => void;
  onRemove: (id: string) => void;
}) {
  const parNom = new Map(services.map((s) => [s.category, s]));

  // Ce qui a Tourné d'abord (CA décroissant), puis les charges dont la clé ne matche
  // aucune prestation vendue — héritage de l'ancienne saisie par catégorie.
  const rows: { cle: string; ca?: number }[] = [
    ...sold.map((s) => ({ cle: s.product.name, ca: s.revenue })),
    ...services
      .filter((s) => !sold.some((p) => p.product.name === s.category))
      .sort((a, b) => b.amount - a.amount)
      .map((s) => ({ cle: s.category })),
  ];

  if (rows.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="mb-2 text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded inline-block">
          Services
        </h3>
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Aucune prestation vendue sur la période
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 max-w-5xl">
      <h3 className="mb-2 text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded inline-block">
        Services
      </h3>
      {rows.map(({ cle, ca }) => {
        const existante = parNom.get(cle);
        return (
          <div key={cle} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{cle}</span>
            {ca !== undefined && (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {`CA ${formatFCFA(ca)}`}
              </span>
            )}
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={existante && existante.amount > 0 ? String(existante.amount) : ""}
              placeholder="Coût global (FCFA)"
              aria-label={`Coût de la prestation ${cle}`}
              className="h-9 w-36 text-right tabular-nums bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
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
                // Réécrit si elle existe : une seule charge par prestation et par période,
                // jamais une seconde ligne pour la même prestation.
                if (amount !== (existante?.amount ?? 0)) {
                  onSave(cle, amount, existante?.id);
                }
              }}
            />
          </div>
        );
      })}
    </section>
  );
}
