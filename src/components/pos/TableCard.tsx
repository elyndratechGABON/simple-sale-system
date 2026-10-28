// Plan de salle simplifié : une carte par table, deux états possibles — libre ou occupée.
// Une table libre n'a pas d'addition ; une table occupée a une addition ouverte (status: "open").
// L'état passe par la couleur et le montant — pas par un cycle de service.

import { useRef } from "react";
import type { Sale } from "@/lib/db";
import { formatFCFA, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LONG_PRESS_MS } from "@/lib/pos/types";

export function TableCard({
  label,
  table,
  active,
  disabled,
  onClick,
  onLongPress,
}: {
  label: string;
  table: Sale | null;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  onLongPress?: () => void;
}) {
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

  return (
    <div
      className={cn(
        "select-none [-webkit-touch-callout:none]",
        "flex min-h-[72px] flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
        "hover:border-primary",
        busy ? "border-orange-300 bg-orange-50" : "border-border bg-card",
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
            : table.total > 0
              ? `Table ${label}, occupée, ${formatFCFA(table.total)} à encaisser`
              : `Table ${label}, occupée. Appui long pour libérer.`
        }
        className={cn(
          "flex w-full flex-col gap-1 rounded-md text-left",
          !disabled && "active:scale-[0.98]",
          !busy && disabled && "cursor-default",
        )}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-semibold leading-tight text-foreground">
            {label}
          </span>
          {busy && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
        </span>
        {!busy ? (
          <span className="text-xs leading-tight text-muted-foreground">Libre</span>
        ) : (
          <>
            <span className="font-bold leading-tight text-orange-700 tabular-nums">
              {formatFCFA(table.total)}
            </span>
            <span className="text-xs leading-tight text-orange-600">
              {table.opened_at ? formatTime(table.opened_at) : "occupée"}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
