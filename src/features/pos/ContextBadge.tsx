import { cn } from "@/lib/utils";
import { formatFCFA } from "@/lib/format";
import type { Target } from "@/lib/pos/types";

interface ContextBadgeProps {
  target: Target;
  total: number;
  onBackToCounter: () => void;
}

export function ContextBadge({ target, total, onBackToCounter }: ContextBadgeProps) {
  const isTable = target.kind === "table";

  if (!isTable) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border bg-muted px-3 py-1.5 text-sm font-medium",
          "cursor-default",
        )}
      >
        <span className="h-4 w-4" aria-hidden="true">
          🏠
        </span>
        Comptoir
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onBackToCounter}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-green-50 border-green-200 px-3 py-1.5 text-sm font-medium text-green-800",
        "cursor-pointer hover:bg-green-100 transition-colors",
      )}
      aria-label={`Retour au comptoir depuis ${target.kind === "table" ? "table" : "comptoir"}`}
    >
      <span className="h-4 w-4" aria-hidden="true">
        🪑
      </span>
      <span className="flex items-center gap-1">
        <span>Table</span>
        <span className="text-green-600">
          {total > 0 ? ` · ${total.toLocaleString("fr-FR")} €` : ""}
        </span>
      </span>
    </button>
  );
}
