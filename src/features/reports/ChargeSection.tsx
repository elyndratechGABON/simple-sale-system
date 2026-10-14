import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";

export interface ChargeLine {
  id: string;
  label: string;
  amount: number;
}

/**
 * Un bloc de charges en LECTURE : la liste, son total, et le bouton qui ouvre le dialogue.
 *
 * PRESENTATION pure — la même charge ne s'affiche pas forcément de la même façon partout,
 * mais la somme, elle, ne se recalcule pas dans chaque écran.
 */
export function NetLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function ChargeSection({
  title,
  total,
  empty,
  lines,
  onEdit,
  showTotal = true,
}: {
  title: string;
  total: number;
  empty: string;
  lines: ChargeLine[];
  onEdit: () => void;
  /** Le total peut être énoncé ailleurs — le répéter afficherait deux fois le même nombre. */
  showTotal?: boolean;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1.5" /> Modifier
        </Button>
      </div>
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="rounded-lg border px-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-2 border-b py-2 text-sm last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate">{line.label}</span>
              <span className="shrink-0 tabular-nums">{formatFCFA(line.amount)}</span>
            </div>
          ))}
          {showTotal && (
            <div className="flex items-center gap-2 py-2 text-sm font-semibold">
              <span className="min-w-0 flex-1">Total</span>
              <span className="shrink-0 tabular-nums">{formatFCFA(total)}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
