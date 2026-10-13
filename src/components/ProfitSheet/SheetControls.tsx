import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/profit";
import { cn } from "@/lib/utils";

/** Sélecteur de mois + bascule Simple / Détaillé. */
export function SheetControls({
  month,
  atCurrentMonth,
  onPrev,
  onNext,
  mode,
  onModeChange,
}: {
  month: string;
  atCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  mode: "simple" | "detail";
  onModeChange: (m: "simple" | "detail") => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Mois précédent"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-accent"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold capitalize">
          {monthLabel(month)}
        </span>
        <button
          type="button"
          aria-label="Mois suivant"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40"
          disabled={atCurrentMonth}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => onModeChange("simple")}
          className={cn(
            "h-8 rounded-md text-sm font-medium transition-colors",
            mode === "simple"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => onModeChange("detail")}
          className={cn(
            "h-8 rounded-md text-sm font-medium transition-colors",
            mode === "detail"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Détaillé
        </button>
      </div>
    </>
  );
}
