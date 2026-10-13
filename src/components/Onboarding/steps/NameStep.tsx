import { Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepShell } from "../StepShell";
import type { SetupWizardApi } from "../useSetupWizard";

export function NameStep({ w }: { w: SetupWizardApi }) {
  return (
    <StepShell
      icon={Store}
      title="Nom du commerce"
      description="Comment s'appelle votre établissement ?"
    >
      <Label htmlFor="ob-name">Nom de l'entreprise</Label>
      <Input
        id="ob-name"
        value={w.name}
        onChange={(e) => w.setName(e.target.value)}
        placeholder="Ex : Alimentation Chez Marie"
        className="h-12 text-lg"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && w.canNext() && w.goNext()}
      />
    </StepShell>
  );
}
