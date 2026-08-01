import { Card, CardContent } from "@/components/ui/card";

// Extrait de src/routes/reports.tsx pour être partagé avec le tableau de bord :
// les deux écrans doivent afficher les mêmes KPI avec la même présentation.
export function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div
          className={"mt-1 text-2xl font-bold " + (highlight ? "text-primary" : "text-foreground")}
        >
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
