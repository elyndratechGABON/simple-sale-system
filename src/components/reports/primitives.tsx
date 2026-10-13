// Briques d'affichage de la Comptabilité : KPI, statistique du jour, ligne de
// classement. Aucune ne tient d'état ni de requête — les trois étaient définies dans
// le fichier de 1030 lignes, imbriquées entre deux composants de 300 lignes.

import { cn } from "@/lib/utils";

/** Une zone du bloc KPI. `accent` met la valeur en vert principal et en gras. */
export function Kpi({
  label,
  value,
  hint,
  accent,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-semibold tabular-nums",
          small ? "text-sm" : "text-base sm:text-lg",
          accent ? "text-primary" : "",
        )}
      >
        {value}
      </p>
      {hint && <p className="truncate text-[11px] text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  );
}

export function DayStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** Ligne de classement du panneau sectorisé. */
export function RankRow({
  index,
  name,
  meta,
  value,
}: {
  index: number;
  name: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1 py-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
        {index}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>
      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
