import { useState } from "react";
import { KeyRound } from "lucide-react";
import { PinSetupDialog } from "@/components/settings/PinSetupDialog";
import { isPinSet } from "@/lib/pin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PinCard() {
  const [open, setOpen] = useState(false);
  // `isPinSet()` lit `localStorage` : il n'est pas réactif. `key` force le remontage du
  // dialogue à chaque ouverture, pour qu'il relise l'état au bon moment.
  const [key, setKey] = useState(0);
  return (
    <div className="flat-card space-y-3">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Code PIN d'annulation
        </h2>
        <p className="text-small text-muted-foreground">
          Demandé avant d'annuler une vente encaissée ou une table, avec restauration du stock. Un
          code à 4 chiffres que tout le monde devine n'annule plus rien.
        </p>
        <p className="mt-2 text-small text-destructive">
          ⚠️ Conservez ce code précieusement. Il est le seul moyen de récupérer votre compte si vous
          perdez votre téléphone.
        </p>
      </header>
      <div className="flex items-center justify-between gap-3">
        <span className="text-small text-muted-foreground">
          {isPinSet()
            ? "Un code est défini sur cette caisse."
            : "Aucun code défini — 4 chiffres suffisent."}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setKey((n) => n + 1);
            setOpen(true);
          }}
        >
          {isPinSet() ? "Changer" : "Créer"}
        </Button>
      </div>
      <PinSetupDialog key={key} open={open} onOpenChange={setOpen} />
    </div>
  );
}
