// Brique d'affichage de la Comptabilité. Aucune ne tient d'état ni de requête.

import { cn } from "@/lib/utils";

/** Une zone du bloc KPI. `accent` met la valeur en vert principal et en gras. */
export function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold tabular-nums sm:text-lg",
          accent ? "text-primary" : "",
        )}
      >
        {value}
      </p>
      {hint && <p className="truncate text-[11px] text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  );
}
