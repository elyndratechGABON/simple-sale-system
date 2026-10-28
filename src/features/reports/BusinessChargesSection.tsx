import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BusinessChargeLine } from "@/lib/reports/charges-by-period";

interface Draft {
  key: number;
  label: string;
  amount: string;
}

/**
 * Charges du BUSINESS : postes libres (loyer, électricité, salaire…) que le commerçant
 * nomme lui-même. Aucune liste imposée — à la différence des charges de service, un poste
 * d'exploitation ne se déduit pas des ventes.
 *
 * Pas de « Modifier » : déjà des champs en ligne. « + Ajouter une charge » insère une
 * ligne VIDE, purement locale : rien n'arrive en base tant que l'intitulé et le montant
 * ne sont pas complétés — au blur de l'un ou de l'autre, la ligne s'enregistre (elle
 * réapparaît alors comme une ligne enregistrée). Une ligne vide abandonnée se jette en
 * même temps que l'écran : RIEN à nettoyer en base, même pas à la fermeture.
 *
 * PRESENTATION pure, comme `ServiceChargesSection` : la sauvegarde et la suppression
 * passent par des props. Une ligne enregistrée = UN enregistrement en base.
 */
export function BusinessChargesSection({
  business,
  onSave,
  onRemove,
}: {
  business: BusinessChargeLine[];
  onSave: (label: string, amount: number, id?: string) => void;
  onRemove: (id: string) => void;
}) {
  const [nextKey, setNextKey] = useState(1);
  /** Lignes vides non enregistrées — locales, jetables. */
  const [drafts, setDrafts] = useState<Draft[]>([]);

  function ajouter() {
    setDrafts((d) => [...d, { key: nextKey, label: "", amount: "" }]);
    setNextKey((k) => k + 1);
  }

  function jeterDraft(key: number) {
    setDrafts((d) => d.filter((x) => x.key !== key));
  }

  /** Complété (intitulé + montant) au blur → enregistrement, puis la ligne disparaît du
   * brouillon : elle revient du côté base, via l'invalidation de l'hôte. */
  function enregistrerDraft(draft: Draft) {
    const label = draft.label.trim();
    const amount = Number(draft.amount);
    if (!label || draft.amount.trim() === "" || Number.isNaN(amount) || amount < 0) return;
    // Réécrit si le poste existe déjà : pas de doublon.
    const existante = business.find((b) => b.label === label);
    onSave(label, amount, existante?.id);
    jeterDraft(draft.key);
  }

  return (
    <section className="space-y-2">
      <h3 className="mb-2 text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded inline-block">
        Business
      </h3>

      {business.length === 0 && drafts.length === 0 && (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Aucune charge d'exploitation sur la période
        </p>
      )}

      {business.map((line) => (
        <div key={line.id} className="flex items-center gap-2">
          {/* `key` sur le renommage : un nom changé DOIT reposer l'input non contrôlé. */}
          <Input
            key={line.label}
            defaultValue={line.label}
            aria-label={`Nom de la charge ${line.label}`}
            className="h-9 min-w-0 flex-1 bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
            onBlur={(e) => {
              const label = e.target.value.trim();
              if (!label) {
                // Un poste sans nom n'existe pas : on restaure, on ne détruit rien.
                e.target.value = line.label;
                return;
              }
              if (label !== line.label) onSave(label, line.amount, line.id);
            }}
          />
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={line.amount > 0 ? String(line.amount) : ""}
            placeholder="—"
            aria-label={`Montant de la charge ${line.label}`}
            className="h-9 w-32 text-right tabular-nums bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
            onBlur={(e) => {
              const raw = e.target.value.trim();

              // Champ VIDÉ : suppression immédiate, exactement comme le bouton 🗑 et
              // comme la section service. Un geste, un effet.
              if (raw === "") {
                onRemove(line.id);
                return;
              }

              const amount = Number(raw);
              if (Number.isNaN(amount) || amount < 0) {
                e.target.value = line.amount > 0 ? String(line.amount) : "";
                return;
              }
              if (amount !== line.amount) onSave(line.label, amount, line.id);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-destructive"
            aria-label={`Supprimer la charge ${line.label}`}
            onClick={() => onRemove(line.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {drafts.map((draft) => (
        <div key={draft.key} className="flex items-center gap-2">
          <Input
            value={draft.label}
            onChange={(e) =>
              setDrafts((d) =>
                d.map((x) => (x.key === draft.key ? { ...x, label: e.target.value } : x)),
              )
            }
            placeholder="Nom du poste…"
            aria-label="Nom du nouveau poste"
            className="h-9 min-w-0 flex-1 bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
            onBlur={() => enregistrerDraft(draft)}
          />
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={draft.amount}
            onChange={(e) =>
              setDrafts((d) =>
                d.map((x) => (x.key === draft.key ? { ...x, amount: e.target.value } : x)),
              )
            }
            placeholder="Montant"
            aria-label="Montant du nouveau poste"
            className="h-9 w-32 text-right tabular-nums bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
            onBlur={() => enregistrerDraft(draft)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-destructive"
            aria-label="Abandonner cette charge"
            onClick={() => jeterDraft(draft.key)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-auto"
        onClick={ajouter}
        aria-label="Ajouter une charge"
      >
        <Plus className="h-4 w-4 mr-1.5" /> Ajouter une charge
      </Button>
    </section>
  );
}
