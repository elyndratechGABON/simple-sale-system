import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  large?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary/30 bg-primary/5")}>
      <CardContent className={cn(large ? "p-5" : "p-4")}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p
          className={cn(
            "mt-1.5 font-bold tabular-nums",
            large ? "text-3xl" : "text-2xl",
            highlight ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
