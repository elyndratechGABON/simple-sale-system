// Modal de renouvellement manuel via Airtel Money. Trois étapes guidées :
// 1. Instructions USSD (*110#) avec bouton qui compose le numéro
// 2. Saisie de la référence de transaction
// 3. Confirmation via WhatsApp (lien wa.me pré-rempli)
//
// Le numéro WhatsApp du service client est le même que dans SuspendedScreen.tsx.
import { useState } from "react";
import { Smartphone, Copy, Check, MessageCircle, ExternalLink } from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPPORT_WHATSAPP = "https://wa.me/241076505254";
const SUPPORT_PHONE = "241076505254";
const USSD_CODE = "*110#";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  ownerName: string;
}

export function PaymentModal({ open, onOpenChange, storeName, ownerName }: PaymentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setStep(1);
    setReference("");
    setCopied(false);
    onOpenChange(false);
  }

  function buildWhatsappUrl(): string {
    const msg = [
      `Salut, je souhaite renouveler mon abonnement.`,
      ``,
      `Boutique : ${storeName}`,
      `Propriétaire : ${ownerName}`,
      reference ? `Référence Airtel Money : ${reference}` : ``,
      ``,
      `Merci de confirmer la prolongation.`,
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
            Renouveler l'abonnement
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

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Composez ce numéro sur votre téléphone :
              </p>
              <a
                href={`tel:${USSD_CODE}`}
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

            <Button className="w-full gap-2" asChild>
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

            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
