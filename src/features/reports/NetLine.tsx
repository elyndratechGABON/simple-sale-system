import { formatFCFA } from "@/lib/format";

/**
 * Une ligne de lecture (libellé, montant) du bloc final.
 *
 * PRESENTATION pure — la même donnée ne s'affiche pas forcément de la même façon partout,
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
