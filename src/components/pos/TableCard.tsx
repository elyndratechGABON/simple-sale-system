// Plan de salle : une carte par table, lue sur les données existantes — aucun geste
// supplémentaire n'est nécessaire pour savoir dans quel état elle est.
//
// Une table libre ou occupée garde la même taille et la même place : c'est ce qui rend la
// grille lisible sans la relire. L'état passe par la couleur, le montant et le point —
// pas par la position.

import { useRef } from "react";
import type { Sale } from "@/lib/db";
import { formatFCFA, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LONG_PRESS_MS, tableStage } from "@/lib/pos/table-stage";

export function TableCard({
  label,
  table,
  active,
  disabled,
  showServiceCycle,
  onClick,
  onLongPress,
  onPrepare,
  onReady,
  onServe,
}: {
  label: string;
  table: Sale | null;
  active: boolean;
  disabled: boolean;
  showServiceCycle: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  onPrepare?: () => void;
  onReady?: () => void;
  onServe?: () => void;
}) {
  const stage = tableStage(table);
  // `busy` sert aussi de narrowing : TypeScript ne sait pas déduire `table` depuis
  // `stage`, il sait depuis `busy`.
  const busy = table !== null;
  const timer = useRef<number | null>(null);
  // Le `pointerup` qui suit un appui long déclenche aussi le `click` : sans ce drapeau,
  // libérer une table la rouvrirait dans la foulée.
  const fired = useRef(false);

  function stop() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  // La cuisine n'avance qu'au cran où elle se trouve : une commande « à préparer » n'a
  // qu'un bouton « Préparer », une « en préparation » un « Prêt », une « prête » un
  // « Servir ». Servie ou réglée, il n'y a plus rien à cuisiner.
  const cycleAction =
    showServiceCycle && busy
      ? stage === "to-prepare"
        ? { label: "Préparer", cb: onPrepare }
        : stage === "preparing"
          ? { label: "Prêt", cb: onReady }
          : stage === "ready"
            ? { label: "Servir", cb: onServe }
            : null
      : null;

  return (
    <div
      className={cn(
        "select-none [-webkit-touch-callout:none]",
        "flex min-h-[64px] flex-col rounded-lg border px-2 py-1.5 text-left transition-all",
        "hover:border-primary",
        stage === "libre" && "bg-card",
        stage === "to-prepare" && "border-orange-400/60 bg-orange-50 dark:bg-orange-950/20",
        stage === "preparing" && "border-warning/60 bg-warning/15",
        stage === "ready" && "border-green-500/60 bg-green-50 dark:bg-green-950/20",
        stage === "served" && "border-primary/40 bg-accent",
        stage === "paid" && "border-primary/40 bg-accent",
        active && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (fired.current) return;
          onClick();
        }}
        onPointerDown={() => {
          fired.current = false;
          if (!onLongPress) return;
          timer.current = window.setTimeout(() => {
            fired.current = true;
            onLongPress();
          }, LONG_PRESS_MS);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        // Sur téléphone, un appui long ouvre sinon le menu contextuel du navigateur
        // par-dessus le plan de salle.
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-pressed={active}
        aria-label={
          !busy
            ? `Table ${label}, libre`
            : stage === "to-prepare"
              ? `Table ${label}, à préparer`
              : stage === "preparing"
                ? `Table ${label}, en préparation`
                : stage === "ready"
                  ? `Table ${label}, prête à servir`
                  : stage === "served"
                    ? table.total > 0
                      ? `Table ${label}, servie, ${formatFCFA(table.total)} à encaisser`
                      : `Table ${label}, servie. Appui long pour libérer.`
                    : table.total > 0
                      ? `Table ${label}, partiellement encaissée, ${formatFCFA(table.total)} restants`
                      : `Table ${label}, réglée. Appui long pour libérer.`
        }
        className={cn(
          "flex w-full flex-col gap-0.5 rounded-md text-left",
          !disabled && "active:scale-[0.98]",
          !busy && disabled && "cursor-default",
        )}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-semibold leading-tight">{label}</span>
          {stage !== "libre" && (
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                stage === "to-prepare" && "bg-orange-500",
                stage === "preparing" && "bg-warning",
                stage === "ready" && "bg-green-500",
                (stage === "served" || stage === "paid") && "bg-primary",
              )}
            />
          )}
        </span>
        {!busy ? (
          <span className="text-xs leading-tight text-muted-foreground">libre</span>
        ) : stage === "to-prepare" ? (
          <span className="font-bold leading-tight text-orange-600 dark:text-orange-400 tabular-nums">
            à préparer
          </span>
        ) : stage === "preparing" ? (
          <span className="font-bold leading-tight text-warning tabular-nums">en préparation</span>
        ) : stage === "ready" ? (
          <span className="font-bold leading-tight text-green-600 dark:text-green-400 tabular-nums">
            prête
          </span>
        ) : stage === "served" ? (
          <span className="font-bold leading-tight text-primary tabular-nums">servie</span>
        ) : stage === "paid" && table.total <= 0 ? (
          <span className="font-bold leading-tight text-primary tabular-nums">réglée</span>
        ) : (
          <span className="max-w-full truncate font-bold leading-tight text-primary tabular-nums">
            {formatFCFA(table.total)}
          </span>
        )}
        {busy && stage !== "served" && stage !== "paid" && (
          <span className="text-[11px] leading-tight text-muted-foreground">
            {table.opened_at ? formatTime(table.opened_at) : "occupée"}
          </span>
        )}
      </button>
      {busy && cycleAction && (
        <button
          type="button"
          disabled={disabled}
          onClick={cycleAction.cb}
          className={cn(
            "mt-1 w-full rounded-md border px-1 py-0.5 text-[11px] font-semibold leading-tight transition-colors",
            "border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-60",
          )}
        >
          {cycleAction.label}
        </button>
      )}
    </div>
  );
}
