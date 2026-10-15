import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BusinessChargeLine } from "@/lib/reports/charges-by-period";

/**
 * Charges du BUSINESS : postes libres (loyer, électricité, salaire…) que le commerçant
 * nomme lui-même. Aucune liste imposée — à la différence des charges de service, un poste
 * d'exploitation ne se déduit pas du catalogue.
 *
 * PRESENTATION pure, comme `ServiceChargesSection` : la sauvegarde et la suppression
 * passent en props. Une ligne = UN enregistrement en base.
 *
 * Différence avec les charges de service : ici le « + Ajouter » peut créer une ligne vide
 * (intitulé + montant saisis dans le pied de section). C'est à CE titre que le dialogue
 * nettoie encore les charges à 0 à la fermeture — un filet, plus le geste principal.
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
  const [ajout, setAjout] = useState("");
  const [montantAjout, setMontantAjout] = useState("");

  function ajouter() {
    const label = ajout.trim();
    const amount = Number(montantAjout);
    if (!label || montantAjout.trim() === "" || Number.isNaN(amount) || amount < 0) return;
    // Réécrit si le poste existe déjà : pas de doublon.
    const existante = business.find((b) => b.label === label);
    onSave(label, amount, existante?.id);
    setAjout("");
    setMontantAjout("");
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Charges du business</h3>

      {business.length === 0 && (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Aucune charge d'exploitation sur la période
        </p>
      )}

      {business.map((line) => (
        <div key={line.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{line.label}</span>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={line.amount > 0 ? String(line.amount) : ""}
            placeholder="—"
            aria-label={`Montant de la charge ${line.label}`}
            className="h-9 w-32 text-right tabular-nums"
            onBlur={(e) => {
              const raw = e.target.value.trim();

              // Champ VIDÉ : suppression immédiate, exactement comme le bouton 🗑 et
              // comme la section service. Passait par « enregistrer 0 » avant — le
              // dialogue effaçait les 0 à la fermeture, mais `close()` lit l'état figé du
              // rendu précédent : la refetch du blur n'est pas terminée, et la ligne
              // réapparaissait à 0. Un geste, un effet.
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

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={ajout}
          onChange={(e) => setAjout(e.target.value)}
          placeholder="Nouveau poste…"
          aria-label="Intitulé du poste"
          className="h-9 flex-1"
        />
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={montantAjout}
          onChange={(e) => setMontantAjout(e.target.value)}
          placeholder="Montant"
          aria-label="Montant du nouveau poste"
          className="h-9 w-32 text-right tabular-nums"
        />
        <Button
          size="sm"
          onClick={ajouter}
          disabled={!ajout.trim() || !montantAjout.trim()}
          aria-label="Ajouter une charge"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
