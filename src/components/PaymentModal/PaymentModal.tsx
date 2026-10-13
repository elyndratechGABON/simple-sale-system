// Modal de renouvellement manuel via Mobile Money. Deux chemins, au choix après le
// paiement :
//   A. Déblocage OFFLINE (recommandé « sans serveur ») : le marchand colle le SMS de
//      confirmation de l'opérateur → la caisse parse montant/TID et déverrouille sur
//      place, même si l'orchestrateur (sur le PC du marchand) est éteint.
//   B. Validation admin (serveur) : saisie de la référence + envoi de la demande à
//      l'orchestrateur (POST /api/v1/requests), validée en un clic depuis le tableau de
//      bord. Le lien WhatsApp reste en secours si le serveur est injoignable.
import { Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanInfo } from "@/lib/pricing";
import { StepAdmin } from "./StepAdmin";
import { StepChooseMethod, StepOfflineSms, StepUssd } from "./Steps";
import { usePaymentFlow } from "./usePaymentFlow";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  ownerName: string;
  selectedPlan?: PlanInfo | null;
}

export function PaymentModal({
  open,
  onOpenChange,
  storeName,
  ownerName,
  selectedPlan,
}: PaymentModalProps) {
  const flow = usePaymentFlow({ onOpenChange, storeName, ownerName, selectedPlan });
  const { step, handleClose } = flow;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {selectedPlan ? `Souscrire — Plan ${selectedPlan.name}` : "Renouveler l'abonnement"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Étape 1/2 — Effectuez le paiement"
              : step === 2
                ? "Étape 2/2 — Comment confirmer le paiement ?"
                : step === 3
                  ? "Validation par l'administrateur"
                  : "Déblocage immédiat (hors ligne)"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && <StepUssd selectedPlan={selectedPlan} onPaid={() => flow.setStep(2)} />}

        {step === 2 && (
          <StepChooseMethod
            onOffline={() => flow.setStep(4)}
            onAdmin={() => flow.setStep(3)}
            onBack={() => flow.setStep(1)}
          />
        )}

        {step === 4 && <StepOfflineSms flow={flow} />}

        {step === 3 && <StepAdmin flow={flow} storeName={storeName} selectedPlan={selectedPlan} />}
      </DialogContent>
    </Dialog>
  );
}
