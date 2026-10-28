import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Zone du bandeau de synthèse. La couleur ne teinte QUE le chiffre en état
 * d'alerte : un fond rouge sur toute la zone transformerait un compteur en
 * alarme, alors qu'il n'y a rien d'alarmant dans le nombre lui-même.
 */
function KpiCell({
  label,
  value,
  tone = "neutral",
  primary,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
  primary?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p
        className={cn(
          "truncate font-semibold leading-tight tabular-nums",
          primary ? "text-lg font-bold sm:text-xl" : "text-sm",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs leading-none text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Bandeau de synthèse à 4 zones. Un seul bandeau au lieu de 4 cards : les données
 * sont identiques, seul l'encombrement disparaît (ces 4 cards prenaient ~370 px
 * avant d'atteindre les actions). La couleur ne teinte QUE le chiffre en état
 * d'alerte, jamais le bloc entier.
 */
export function StocksSummary({
  value,
  productCount,
  low,
  out,
}: {
  value: number;
  productCount: number;
  low: number;
  out: number;
}) {
  return (
    <div className="flat-card grid grid-cols-[1.5fr_1fr_1fr_1fr] divide-x divide-border p-0">
      <KpiCell label="Stock" value={formatFCFA(value)} primary />
      <KpiCell label="Produits" value={String(productCount)} />
      <KpiCell label="Faible" value={String(low)} tone="warning" />
      <KpiCell label="Rupture" value={String(out)} tone="danger" />
    </div>
  );
}
