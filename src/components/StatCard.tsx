import { Card, CardContent } from "@/components/ui/card";

// Extrait de src/routes/reports.tsx pour être partagé avec le tableau de bord :
// les deux écrans doivent afficher les mêmes KPI avec la même présentation.
export function StatCard({
  label,
  value,
  hint,
  highlight,
  large,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  /** Variante synthèse : typographie plus grande pour les KPI de tête. */
  large?: boolean;
}) {
  return (
    <Card>
      <CardContent className={large ? "p-5" : "p-4"}>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div
          className={
            "mt-1 font-bold " +
            (large ? "text-3xl " : "text-2xl ") +
            (highlight ? "text-primary" : "text-foreground")
          }
        >
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
