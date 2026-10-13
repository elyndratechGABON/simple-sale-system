import { useState } from "react";
import { KeyRound } from "lucide-react";
import { PinSetupDialog } from "@/components/settings/PinSetupDialog";
import { isPinSet } from "@/lib/pin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PinCard() {
  const [open, setOpen] = useState(false);
  // `isPinSet()` lit `localStorage` : il n'est pas réactif. `key` force le remontage du
  // dialogue à chaque ouverture, pour qu'il relise l'état au bon moment.
  const [key, setKey] = useState(0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Code PIN d'annulation
        </CardTitle>
        <CardDescription>
          Demandé avant d'annuler une vente encaissée ou une table, avec restauration du stock. Un
          code à 4 chiffres que tout le monde devine n'annule plus rien.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
