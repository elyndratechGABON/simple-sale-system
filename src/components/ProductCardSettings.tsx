import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import {
  ALL_CARD_FIELDS,
  CARD_FIELD_LABELS,
  CARD_PRESETS,
  moveField,
  presetFields,
  type CardContext,
  type ProductCardField,
} from "@/lib/card-display";
import { savePreferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";
import { ProductCardPreview } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const CONTEXT_LABEL: Record<CardContext, string> = {
  stocks: "Page Stocks",
  caisse: "Page Caisse",
};

const PREF_KEY: Record<CardContext, "stockCardFields" | "caisseCardFields"> = {
  stocks: "stockCardFields",
  caisse: "caisseCardFields",
};

/**
 * Réglage d'affichage des cards produit (§11 à §14).
 *
 * Un composant pour les deux contextes : il ne fait que choisir la clé de préférence
 * et le libellé. La liste de champs, les presets et l'aperçu sont dans
 * `card-display.ts` et `ProductCard.tsx` — donc exactement la même mécanique qu'une
 * carte de /pos et qu'une carte de /stocks, sans seconde implémentation (§31).
 *
 * L'écriture est optimiste et immediate : `savePreferences` met à jour le cache
 * React Query, l'aperçu change donc dans le même rendu que le clic (§13).
 */
export function ProductCardSettings({ context }: { context: CardContext }) {
  const prefs = usePreferences();
  const { isOwner } = useAccess();
  const qc = useQueryClient();
  const fields = prefs[PREF_KEY[context]];

  const write = (next: ProductCardField[]) => {
    savePreferences({ [PREF_KEY[context]]: next });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  };

  const toggle = (field: ProductCardField) => {
    // Le nom ne se retire pas : une card sans titre n'a plus de sens dans la grille.
    if (field === "name" && fields.includes(field)) return;
    write(
      fields.includes(field) ? fields.filter((f) => f !== field) : [...fields, field],
    );
  };

  const activePreset = useMemo(
    () =>
      (Object.keys(CARD_PRESETS) as (keyof typeof CARD_PRESETS)[]).find(
        (key) =>
          CARD_PRESETS[key].length === fields.length &&
          CARD_PRESETS[key].every((f) => fields.includes(f)),
      ) ?? null,
    [fields],
  );

  if (!isOwner) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <EyeOff className="h-4 w-4" /> Affichage des cards produits
          </CardTitle>
          <CardDescription className="text-xs">
            {CONTEXT_LABEL[context]} — seul le propriétaire choisit les informations
            affichées sur les cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-1.5">
            {fields.map((f) => (
              <li
                key={f}
                className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium"
              >
                {CARD_FIELD_LABELS[f]}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Affichage des cards produits</CardTitle>
        <CardDescription className="text-xs">
          {CONTEXT_LABEL[context]} — choisissez ce qui apparaît sur chaque fiche produit et
          dans quel ordre. Rien n&apos;est affiché tant que vous ne l&apos;avez pas coché.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Presets (§14) ── */}
        <div className="space-y-1.5">
          <Label className="text-xs">Modèles</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(CARD_PRESETS) as (keyof typeof CARD_PRESETS)[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={activePreset === key ? "default" : "outline"}
                className="h-9 text-xs"
                onClick={() => write(presetFields(key))}
              >
                {key === "compact" ? "Compact" : key === "standard" ? "Standard" : "Détaillé"}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Champs visibles (§10) ── */}
        <div className="space-y-1.5">
          <Label className="text-xs">Informations visibles</Label>
          <div className="divide-y divide-border rounded-lg border">
            {ALL_CARD_FIELDS.map((field) => {
              const on = fields.includes(field);
              const locked = field === "name" && on;
              return (
                <div key={field} className="flex items-center justify-between gap-3 px-3 py-2">
                  <Label
                    htmlFor={`f-${context}-${field}`}
                    className={cn(
                      "flex-1 text-sm",
                      locked && "text-muted-foreground",
                    )}
                  >
                    {CARD_FIELD_LABELS[field]}
                    {locked && (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        (toujours affiché)
                      </span>
                    )}
                  </Label>
                  <Switch
                    id={`f-${context}-${field}`}
                    checked={on}
                    disabled={locked}
                    onCheckedChange={() => toggle(field)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Ordre (§12) ── */}
        {fields.length > 1 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Ordre d&apos;affichage</Label>
            <p className="text-[11px] text-muted-foreground">
              Les flèches déplacent le champ d&apos;un cran — plus simple au doigt qu&apos;un
              glisser-déposer.
            </p>
            <div className="space-y-1">
              {fields.map((field, i) => (
                <div
                  key={field}
                  className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5"
                >
                  <span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">{CARD_FIELD_LABELS[field]}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Monter ${CARD_FIELD_LABELS[field]}`}
                    disabled={i === 0}
                    onClick={() => write(moveField(fields, field, -1))}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Descendre ${CARD_FIELD_LABELS[field]}`}
                    disabled={i === fields.length - 1}
                    onClick={() => write(moveField(fields, field, 1))}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Aperçu temps réel (§13) ── */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" /> Aperçu
          </Label>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex justify-center">
              <ProductCardPreview fields={fields} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}