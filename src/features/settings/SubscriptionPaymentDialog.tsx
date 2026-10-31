import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { formatFCFA } from "@/lib/format";

/** Dialog de paiement d'abonnement : USSD + WhatsApp, sans validation par l'administration.
 *  Flux : instructions de paiement (numéro + USSD) → « J'ai payé » → zone de collage du
 *  SMS de confirmation → « Double vérifier » ouvre WhatsApp avec le SMS collé.
 *  Props :
 *  - isOpen: booléen pour ouvrir/fermer le dialog
 *  - onClose: callback de fermeture
 *  - plan: { id, name, price } les infos de l'abonnement choisi */
export function SubscriptionPaymentDialog({
  isOpen,
  onClose,
  plan,
}: {
  isOpen: boolean;
  onClose: () => void;
  plan: { id: string; name: string; price: number };
}) {
  const [sms, setSms] = useState("");
  const [step, setStep] = useState<"pay" | "paste">("pay");

  const handleCopyNumber = () => {
    navigator.clipboard.writeText("076505254").then(() => {
      toast.success("Numéro copié", {
        description: "Le numéro 076505254 a été copié dans le presse-papier",
      });
    });
  };

  const handleUSSD = () => {
    window.location.href = "tel:*150*2%23";
  };

  /** Double vérification : WhatsApp vers le numéro de référence, SMS collé pré-rempli. */
  const handleDoubleCheck = () => {
    const text = encodeURIComponent(sms.trim());
    if (!text) return;
    const url = `https://wa.me/24176505254?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paiement de l'abonnement : {plan.name}</DialogTitle>
        </DialogHeader>

        {/* Numéro à copier */}
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Envoyez le montant de <strong className="font-bold">{formatFCFA(plan.price)}</strong>{" "}
            FCFA à ce numéro :
          </p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">076505254</span>
            <button
              onClick={handleCopyNumber}
              className="py-1.5 px-3 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              aria-label="Copier le numéro"
            >
              Copier
            </button>
          </div>
        </div>

        {/* Code USSD */}
        <div className="mt-4">
          <button
            onClick={handleUSSD}
            className="w-full py-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
            aria-label="Lancer le code USSD"
          >
            Lancer le code USSD (*150*2#)
          </button>
        </div>

        {step === "pay" ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Revenez sur l'App après l'envoi pour coller le SMS.
            </p>
            <Button onClick={() => setStep("paste")} className="w-full">
              J'ai payé
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <label className="block text-sm text-muted-foreground">
              Collez le SMS de confirmation reçu de l'opérateur.
            </label>
            <Textarea
              placeholder="Collez le SMS reçu de l'opérateur..."
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              rows={3}
              className="min-h-[80px]"
              autoFocus
            />
            <Button onClick={handleDoubleCheck} disabled={!sms.trim()} className="w-full">
              Double vérifier (WhatsApp)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
