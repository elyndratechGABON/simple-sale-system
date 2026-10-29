import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { RecoveryPinSetupDialog } from "@/components/settings/RecoveryPinSetupDialog";
import { isRecoveryPinSet } from "@/lib/recovery-pin";
import { Button } from "@/components/ui/button";

/**
 * Carte du CODE PIN DE RÉCUPÉRATION (mission sécurité — Étape 4.3) : SAISI SUR UN
 * TÉLÉPHONE NEUF, il rattache la boutique au compte et déconnecte l'ancien appareil.
 * Défaut `0010`, personnalisable ici. Distinct du PIN d'annulation (Caisse), qui
 * protège les gestes destructeurs LOCAUX.
 */
export function RecoveryPinCard() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <div className="flat-card space-y-3">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" /> Code PIN de récupération (Système)
        </h2>
        <p className="text-small text-muted-foreground">
          Saisi sur un TÉLÉPHONE NEUF, il rattache la boutique à votre compte et déconnecte
          l&apos;ancien appareil. Défaut&nbsp;: <b>0010</b>.
        </p>
        <p className="text-small text-destructive">
          ⚠️ Conservez ce code précieusement — c&apos;est la clé du compte.
        </p>
      </header>
      <div className="flex items-center justify-between gap-3">
        <span className="text-small text-muted-foreground">
          {isRecoveryPinSet()
            ? "Un code est défini sur cette boutique."
            : "Aucun code défini — le défaut 0010 reste actif."}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setKey((n) => n + 1);
            setOpen(true);
          }}
        >
          {isRecoveryPinSet() ? "Changer" : "Personnaliser"}
        </Button>
      </div>
      <RecoveryPinSetupDialog key={key} open={open} onOpenChange={setOpen} />
    </div>
  );
}
