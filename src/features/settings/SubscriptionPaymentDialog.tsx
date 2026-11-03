import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { formatFCFA } from "@/lib/format";
import { parsePaymentSms } from "@/lib/sms-payment";
import { submitSubscriptionRequest } from "@/lib/requests";

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
  const [payPhone, setPayPhone] = useState("");
  const [step, setStep] = useState<"pay" | "paste">("pay");
  // ANTI-FRAUDE (mission paiement) : le SMS collé est parsé LOCALEMENT (même
  // grammaire que le déverrouillage offline) — si un montant apparaît et ne vaut
  // PAS le plan choisi, l'envoi est bloqué avant de polluer l'orchestrateur.
  const parsed = parsePaymentSms(sms);
  const montantIncorrect =
    parsed !== null && parsed.amount !== plan.price
      ? `Le SMS annonce ${parsed.amount.toLocaleString("fr-FR")} F, l'abonnement coûte ${plan.price.toLocaleString("fr-FR")} F.`
      : null;

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

  /** Double vérification : WhatsApp D'ABORD puis dépôt à l'orchestrateur.
   *
   *  L'ordre n'est pas esthétique : `window.open` ne part que dans le GESTE
   *  utilisateur — un `await` avant l'ouverture fait bloquer le popup par le
   *  navigateur. Le dépôt orchestrateur est best-effort et non-bloquant.
   */
  const handleDoubleCheck = async () => {
    const text = sms.trim();
    if (!text || montantIncorrect) return;
    // Anti-fraude : un toast ROUGE explicite quand le montant du SMS ne colle pas.
    if (parsed && parsed.amount !== plan.price) {
      toast.error("Le montant du SMS ne correspond pas à l'abonnement choisi.", {
        description: `SMS : ${parsed.amount.toLocaleString("fr-FR")} F — attendu : ${plan.price.toLocaleString("fr-FR")} F.`,
      });
      return;
    }
    // Action 1 : WhatsApp, dans le geste utilisateur.
    const url = `https://wa.me/24176505254?text=${encodeURIComponent(
      `Paiement ${plan.name} (${plan.price.toLocaleString("fr-FR")} FCFA)\nNuméro transaction : ${payPhone.trim()}\n\n${text}`,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Action 2 : dépôt orchestrateur (non-bloquant) via le helper PARTAGÉ
    // `submitSubscriptionRequest` (lib/requests) : même route `/api/v1/requests`,
    // même timeout, et surtout le CORPS D'ERREUR du serveur est remonté tel quel —
    // un 400/404/409 porte le message exact, plus jamais un 403 muet lu comme
    // « injoignable ». `console.error` journalise le statut + corps pour le debug.
    void (async () => {
      const result = await submitSubscriptionRequest({
        planName: plan.name,
        planPrice: plan.price,
        planDevices: 0,
        // Le numéro ayant effectué la transaction (OBLIGATOIRE, mission paiement) :
        // c'est la référence que l'admin croise avec le SMS dans le Control Center.
        reference: payPhone.trim(),
        note: `Vérification double (SMS joint) : ${text}`.slice(0, 500),
      });
      if (result.ok) {
        toast.success("Demande envoyée à l'orchestrateur", {
          description: "Poursuivez sur WhatsApp en attendant la validation.",
        });
      } else {
        console.error(`[orchestrateur] depos refusé : ${result.error}`);
        toast.error("Orchestrateur a refusé la demande", {
          description: result.error ?? "La preuve reste sur WhatsApp — à retransmettre plus tard.",
        });
      }
    })();

    onClose();
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
              Collez le SMS de confirmation reçu de l&apos;opérateur.
            </label>
            <Textarea
              placeholder="Collez le SMS reçu de l'opérateur..."
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              rows={3}
              className="min-h-[80px]"
              autoFocus
            />
            {/* Numéro DE LA TRANSACTION (obligatoire, mission paiement) : l'admin doit
                pouvoir croiser SMS ↔ numéro sans deviner. Prérempli automatiquement
                quand le parseur local trouve le numéro du payeur dans le SMS. */}
            <div className="space-y-1">
              <label className="block text-sm text-muted-foreground">
                Numéro ayant effectué la transaction
              </label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="Ex : 074337844"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value.replace(/[^\d+\s]/g, ""))}
              />
              {parsed && !payPhone.trim() && (
                <p className="text-xs text-muted-foreground">
                  Détecté dans le SMS : {parsed.phone}
                </p>
              )}
            </div>
            {montantIncorrect && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                ⚠️ {montantIncorrect} L&apos;envoi est bloqué.
              </p>
            )}
            <Button
              onClick={handleDoubleCheck}
              disabled={!sms.trim() || !payPhone.trim() || Boolean(montantIncorrect)}
              className="w-full"
            >
              Double vérifier (WhatsApp)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
