import { Check, MonitorSmartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PlanInfo {
  id: "essentiel" | "confort" | "affluence";
  name: string;
  price: number;
  /** Durée couverte par le palier, en jours (miroir du serveur : 30 j par palier). */
  period: string;
  /** Nombre d'appareils (caisses) autorisés simultanément sur le compte. */
  devices: number;
  features: string[];
  isPopular?: boolean;
}

// Paliers d'abonnement ELYNDRA CAISSE — miroir de PRICE_TIERS côté orchestrateur
// (10 000 F = 2 appareils · 25 000 F = 4 · 50 000 F = 8, pour 30 jours chacun).
export const PLANS: PlanInfo[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: 10_000,
    period: "30 jours",
    devices: 2,
    features: [
      "2 caisses simultanées",
      "Accès complet à la caisse",
      "Export PDF / Excel / CSV",
      "Support WhatsApp",
    ],
  },
  {
    id: "confort",
    name: "Confort",
    price: 25_000,
    period: "30 jours",
    devices: 4,
    features: [
      "4 caisses simultanées",
      "Tout du palier Essentiel",
      "Rapports multi-boutiques",
      "Support WhatsApp prioritaire",
    ],
    isPopular: true,
  },
  {
    id: "affluence",
    name: "Affluence",
    price: 50_000,
    period: "30 jours",
    devices: 8,
    features: [
      "8 caisses simultanées",
      "Tout du palier Confort",
      "Idéal bars & restaurants animés",
      "Support téléphonique dédié",
    ],
  },
];

interface PlanCardProps {
  plan: PlanInfo;
  onSelect: (plan: PlanInfo) => void;
}

export function PlanCard({ plan, onSelect }: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-5 transition-all",
        plan.isPopular
          ? "border-primary ring-2 ring-primary shadow-md scale-[1.02]"
          : "hover:border-primary/40 hover:shadow-sm",
      )}
    >
      {plan.isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
          <Sparkles className="h-3 w-3" /> Populaire
        </Badge>
      )}

      <div className="space-y-1.5 text-center border-b pb-4">
        <h3 className="text-lg font-bold">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold tabular-nums">
            {plan.price.toLocaleString("fr-FR")}
          </span>
          <span className="text-sm text-muted-foreground">FCFA / {plan.period}</span>
        </div>
        <div>
          <Badge variant="secondary" className="gap-1 text-xs">
            <MonitorSmartphone className="h-3 w-3" />
            {plan.devices} appareils
          </Badge>
        </div>
      </div>

      <ul className="flex-1 space-y-2 py-4 text-left">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.isPopular ? "default" : "outline"}
        className="w-full"
        onClick={() => onSelect(plan)}
      >
        Choisir ce plan
      </Button>
    </div>
  );
}
