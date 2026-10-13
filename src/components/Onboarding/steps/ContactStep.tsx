import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepShell } from "../StepShell";
import type { SetupWizardApi } from "../useSetupWizard";

export function ContactStep({ w }: { w: SetupWizardApi }) {
  return (
    <StepShell
      icon={Users}
      title="Coordonnées du commerce"
      description="Numéro et quartier (optionnel, peut être complété plus tard)."
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="ob-phone">Téléphone du commerce</Label>
          <Input
            id="ob-phone"
            type="tel"
            value={w.phone}
            onChange={(e) => w.setPhone(e.target.value)}
            placeholder="Ex : +241 06 123 456"
            className="h-12"
          />
        </div>
        <div>
          <Label htmlFor="ob-quarter">Quartier</Label>
          <Input
            id="ob-quarter"
            value={w.quarter}
            onChange={(e) => w.setQuarter(e.target.value)}
            placeholder="Ex : Owendo"
            className="h-12"
          />
        </div>
      </div>
    </StepShell>
  );
}
