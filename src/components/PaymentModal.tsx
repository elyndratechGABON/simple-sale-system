// Modal de renouvellement manuel via Mobile Money. Deux chemins, au choix après le
// paiement :
//   A. Déblocage OFFLINE (recommandé « sans serveur ») : le marchand colle le SMS de
//      confirmation de l'opérateur → la caisse parse montant/TID et déverrouille sur
//      place, même si l'orchestrateur (sur le PC du marchand) est éteint.
//   B. Validation admin (serveur) : saisie de la référence + envoi de la demande à
//      l'orchestrateur (POST /api/v1/requests), validée en un clic depuis le tableau de
//      bord. Le lien WhatsApp reste en secours si le serveur est injoignable.
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
  ScanLine,
  ShieldCheck,
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
import { unlockFromPaymentSms } from "@/lib/offline-unlock";
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

// 1 = USSD, 2 = choix du chemin, 3 = admin, 4 = SMS offline.
type Step = 1 | 2 | 3 | 4;

export function PaymentModal({
  open,
  onOpenChange,
  storeName,
  ownerName,
  selectedPlan,
}: PaymentModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedPlan, setUnlockedPlan] = useState<string | null>(null);

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

  /** Déblocage OFFLINE : colle le SMS de confirmation de l'opérateur → déverrouille sur place. */
  async function handleOfflineUnlock() {
    if (!smsText.trim() || unlocking) return;
    setUnlocking(true);
    try {
      const result = await unlockFromPaymentSms(smsText.trim());
      if (result.ok && result.receipt) {
        setUnlockedPlan(result.receipt.planName);
        toast.success(`Abonnement ${result.receipt.planName} débloqué hors ligne`, {
          description: `Reçu ${result.receipt.amount.toLocaleString("fr-FR")} F — le prochain contact serveur confirmera.`,
        });
      } else {
        const reason = result.reason ?? "unknown";
        const messages: Record<string, string> = {
          not_a_payment_sms: "Ce texte ne ressemble pas à un SMS de confirmation de paiement.",
          no_matching_tier: "Le montant ne correspond à aucun palier (10 000 / 25 000 / 50 000 F).",
          phone_mismatch: "Le numéro du payeur ne correspond pas à la demande en cours.",
        };
        toast.error(messages[reason] ?? "Impossible de déverrouiller à partir de ce SMS.");
      }
    } finally {
      setUnlocking(false);
    }
  }

  function handleClose() {
    setStep(1);
    setReference("");
    setCopied(false);
    setSending(false);
    setSent(false);
    setSmsText("");
    setUnlocking(false);
    setUnlockedPlan(null);
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
            {step === 1
              ? "Étape 1/2 — Effectuez le paiement"
              : step === 2
                ? "Étape 2/2 — Comment confirmer le paiement ?"
                : step === 3
                  ? "Validation par l'administrateur"
                  : "Déblocage immédiat (hors ligne)"}
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
            <p className="text-sm text-muted-foreground">
              Choisissez comment confirmer ce paiement :
            </p>

            <div className="rounded-lg border bg-accent/50 p-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Déblocage immédiat, hors ligne
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Idéal quand l'orchestrateur (sur votre PC) est éteint : collez le SMS de
                confirmation reçu de l'opérateur, la caisse déverrouille sur place.
              </p>
              <Button className="mt-3 w-full" onClick={() => setStep(4)}>
                <ScanLine className="h-4 w-4" />
                Coller le SMS de confirmation
              </Button>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                Validation par l'administrateur
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                La demande part au serveur, l'administrateur la valide en un clic depuis son tableau
                de bord (ou via WhatsApp en secours).
              </p>
              <Button variant="outline" className="mt-3 w-full" onClick={() => setStep(3)}>
                Passer par l'administrateur
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
              Retour
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-sms">SMS de confirmation de l'opérateur</Label>
              <textarea
                id="payment-sms"
                className="w-full min-h-24 rounded-lg border bg-input px-3 py-2 text-sm"
                placeholder={
                  'Collez ici le SMS reçu, ex : "Recu 10000F du 076505254,Client. Nouveau solde … TID: …."'
                }
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                rows={4}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                L'app extrait le montant et le TID, vérifie le palier, puis déverrouille
                immédiatement — même sans serveur.
              </p>
            </div>

            {unlockedPlan ? (
              <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-foreground">
                  Abonnement <strong>{unlockedPlan}</strong> débloqué. Le prochain appel au serveur
                  (au retour en ligne) confirmera définitivement.
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Retour
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!smsText.trim() || unlocking}
                  onClick={() => void handleOfflineUnlock()}
                >
                  <ScanLine className="h-4 w-4" />
                  {unlocking ? "Vérification…" : "Déverrouiller"}
                </Button>
              </div>
            )}

            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-ref">Référence de la transaction</Label>
              <Input
                id="payment-ref"
                placeholder="Référence reçue (TID / numéro de transaction)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Le TID ou la référence reçu par SMS avec la confirmation de paiement.
              </p>
            </div>

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

            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
              Retour au choix du chemin
            </Button>

            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
