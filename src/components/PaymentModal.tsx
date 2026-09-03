// Modal de renouvellement manuel via Airtel Money. Trois étapes guidées :
// 1. Instructions USSD (*110#) avec bouton qui compose le numéro
// 2. Saisie de la référence de transaction
// 3. Envoi de la demande à l'administrateur (un clic) + confirmation WhatsApp en secours
//
// La demande part à l'orchestrateur (POST /api/v1/requests) : le tableau de bord de
// l'administrateur la reçoit en temps réel et valide EN UN CLIC — plus besoin de
// ressaisir le montant à la main. Le lien WhatsApp reste en secours si le serveur est
// injoignable.
import { useState } from "react";
import {
  BadgeCheck,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  CreditCard,
  Send,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { submitSubscriptionRequest } from "@/lib/requests";
import { PAYMENT_WHATSAPP_NUMBER, setPaymentConfirmationPending } from "@/lib/payment-confirmation";
import type { PlanInfo } from "@/lib/pricing";

const SUPPORT_WHATSAPP = `https://wa.me/${PAYMENT_WHATSAPP_NUMBER}`;
const SUPPORT_PHONE = PAYMENT_WHATSAPP_NUMBER;
const USSD_CODE = "*110#";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendRequest() {
    if (!reference.trim() || sending) return;
    setSending(true);
    try {
      const result = await submitSubscriptionRequest({
        planName: selectedPlan?.name ?? "",
        planPrice: selectedPlan?.price ?? 0,
        planDevices: selectedPlan?.devices ?? 0,
        reference,
      });
      if (result.ok) {
        // La demande part au serveur : on pose le drapeau de confirmation WhatsApp.
        // Il ne sera consommé qu'à la VALIDATION serveur (`approved`) — jamais avant.
        if (selectedPlan) {
          setPaymentConfirmationPending({
            planName: selectedPlan.name,
            planPrice: selectedPlan.price,
            planDevices: selectedPlan.devices,
            planPeriod: selectedPlan.period,
            reference: reference.trim(),
            requestedAt: Date.now(),
          });
        }
        setSent(true);
        toast.success("Demande envoyée — l'administrateur la valide depuis son tableau de bord.");
      } else {
        toast.error(result.error ?? "Impossible d'envoyer la demande.");
      }
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setStep(1);
    setReference("");
    setCopied(false);
    setSending(false);
    setSent(false);
    onOpenChange(false);
  }

  function buildWhatsappUrl(): string {
    const planLine = selectedPlan
      ? `Plan : ${selectedPlan.name} — ${selectedPlan.price.toLocaleString("fr-FR")} FCFA / ${selectedPlan.period}`
      : "";
    const msg = [
      `Salut, je souhaite ${selectedPlan ? "souscrire à" : "renouveler"} mon abonnement.`,
      planLine,
      ``,
      `Boutique : ${storeName}`,
      `Propriétaire : ${ownerName}`,
      reference ? `Référence Airtel Money : ${reference}` : ``,
      ``,
      `Merci de confirmer.`,
    ]
      .filter(Boolean)
      .join("\n");
    return `${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  function handleCopyReference() {
    if (!reference) return;
    void navigator.clipboard.writeText(reference).then(() => {
      setCopied(true);
      toast.success("Référence copiée");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {selectedPlan ? `Souscrire — Plan ${selectedPlan.name}` : "Renouveler l'abonnement"}
          </DialogTitle>
          <DialogDescription>
            Étape {step}/3 —{" "}
            {step === 1
              ? "Effectuez le paiement"
              : step === 2
                ? "Entrez la référence"
                : "Confirmez via WhatsApp"}
          </DialogDescription>
        </DialogHeader>

        {selectedPlan && step === 1 && (
          <div className="rounded-lg border bg-accent/50 p-3 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {selectedPlan.name} — {selectedPlan.price.toLocaleString("fr-FR")} FCFA /{" "}
                {selectedPlan.period}
              </p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {selectedPlan.devices} appareils
              </Badge>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Composez ce numéro sur votre téléphone :
              </p>
              {/* `#` non encodé = fragment d'URL : Android tronquait le code USSD
                  au dièse et composait `*110` seul. */}
              <a
                href={`tel:${encodeURIComponent(USSD_CODE)}`}
                className="text-2xl font-bold tracking-widest text-primary hover:underline"
              >
                {USSD_CODE}
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Suivez les instructions pour effectuer le paiement via Airtel Money.
              </p>
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              J'ai effectué le paiement
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-ref">Référence de la transaction</Label>
              <Input
                id="payment-ref"
                placeholder="Ex : 241076505254"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                autoFocus
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Le numéro ou la référence reçu par SMS après le paiement.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Retour
              </Button>
              <Button className="flex-1" disabled={!reference.trim()} onClick={() => setStep(3)}>
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm space-y-2">
              <p className="font-medium">Récapitulatif :</p>
              {selectedPlan && (
                <p className="text-muted-foreground">
                  Plan :{" "}
                  <span className="text-foreground font-medium">
                    {selectedPlan.name} — {selectedPlan.price.toLocaleString("fr-FR")} FCFA /{" "}
                    {selectedPlan.period}
                  </span>
                </p>
              )}
              <p className="text-muted-foreground">
                Boutique : <span className="text-foreground font-medium">{storeName}</span>
              </p>
              <p className="text-muted-foreground">
                Référence : <span className="text-foreground font-medium">{reference}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyReference}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié" : "Copier la référence"}
              </Button>
            </div>

            {sent ? (
              <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-foreground">
                  Demande envoyée. L'administrateur la voit sur son tableau de bord et la valide en
                  un clic — la caisse se débloquera au prochain démarrage.
                </p>
              </div>
            ) : (
              <Button
                className="w-full gap-2"
                disabled={!reference.trim() || sending}
                onClick={() => void handleSendRequest()}
              >
                <Send className="h-4 w-4" />
                {sending ? "Envoi…" : "Envoyer la demande à l'administrateur"}
              </Button>
            )}

            {!sent && (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">ou, en secours</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={buildWhatsappUrl()} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    Confirmer via WhatsApp
                    <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-60" />
                  </a>
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Envoyez le message WhatsApp avec la référence. L'administrateur prolongera votre
                  licence et la caisse sera débloquée automatiquement au prochain contact.
                </p>
              </>
            )}

            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
