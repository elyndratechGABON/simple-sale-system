import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ServiceChargeLine } from "@/lib/reports/charges-by-period";

/**
 * Charges de SERVICE : une ligne par charge enregistrée, et l'ajout se fait parmis les
 * catégories du catalogue qui portent au moins un produit de type `service`.
 *
 * PRESENTATION pure — la sauvegarde et la suppression sont passées en props, la
 * périodicité et l'accès base appartiennent au dialogue. Une ligne = UN enregistrement :
 * « supprimer » retire celui-là, rien d'autre.
 */
export function ServiceChargesSection({
  services,
  available,
  onSave,
  onRemove,
}: {
  services: ServiceChargeLine[];
  /** Catégories de service pas encore saisies sur la période. */
  available: string[];
  onSave: (category: string, amount: number, id?: string) => void;
  onRemove: (id: string) => void;
}) {
  const [ajout, setAjout] = useState("");

  function ajouter() {
    if (!ajout) return;
    // Réécrit s'il existe déjà : pas de doublon (cf. `groupChargesByKind`).
    const existante = services.find((s) => s.category === ajout);
    onSave(ajout, existante?.amount ?? 0, existante?.id);
    setAjout("");
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Charges de service</h3>

      {services.length === 0 && (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Aucune charge de service sur la période
        </p>
      )}

      {services.map((line) => (
        <ServiceChargeLineRow key={line.id} line={line} onSave={onSave} onRemove={onRemove} />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <select
          value={ajout}
          onChange={(e) => setAjout(e.target.value)}
          aria-label="Catégorie à charger"
          className="h-9 flex-1 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">Choisir une catégorie…</option>
          {available.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={ajouter}
          disabled={!ajout}
          aria-label="Ajouter une charge de service"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>
    </section>
  );
}

function ServiceChargeLineRow({
  line,
  onSave,
  onRemove,
}: {
  line: ServiceChargeLine;
  onSave: (category: string, amount: number, id?: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm">{line.category}</span>
      <Input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        defaultValue={line.amount > 0 ? String(line.amount) : ""}
        placeholder="—"
        aria-label={`Montant de la charge ${line.category}`}
        className="h-9 w-32 text-right tabular-nums"
        onBlur={(e) => {
          const amount = Number(e.target.value);
          if (e.target.value.trim() === "" || Number.isNaN(amount) || amount < 0) {
            e.target.value = line.amount > 0 ? String(line.amount) : "";
            return;
          }
          if (amount !== line.amount) onSave(line.category, amount, line.id);
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-destructive"
        aria-label={`Supprimer la charge ${line.category}`}
        onClick={() => onRemove(line.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
