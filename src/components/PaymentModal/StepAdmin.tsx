import { BadgeCheck, Check, Copy, ExternalLink, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanInfo } from "@/lib/pricing";
import type { PaymentFlow } from "./usePaymentFlow";

/** Étape 3 — validation par l'administrateur (serveur) ou WhatsApp en secours. */
export function StepAdmin({
  flow,
  storeName,
  selectedPlan,
}: {
  flow: PaymentFlow;
  storeName: string;
  selectedPlan?: PlanInfo | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment-ref">Référence de la transaction</Label>
        <Input
          id="payment-ref"
          placeholder="Référence reçue (TID / numéro de transaction)"
          value={flow.reference}
          onChange={(e) => flow.setReference(e.target.value)}
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
          Référence : <span className="text-foreground font-medium">{flow.reference}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={flow.handleCopyReference}>
          {flow.copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {flow.copied ? "Copié" : "Copier la référence"}
        </Button>
      </div>

      {flow.sent ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Demande envoyée. L'administrateur la voit sur son tableau de bord et la valide en un
            clic — la caisse se débloquera au prochain démarrage.
          </p>
        </div>
      ) : (
        <Button
          className="w-full gap-2"
          disabled={!flow.reference.trim() || flow.sending}
          onClick={() => void flow.handleSendRequest()}
        >
          <Send className="h-4 w-4" />
          {flow.sending ? "Envoi…" : "Envoyer la demande à l'administrateur"}
        </Button>
      )}

      {!flow.sent && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou, en secours</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full gap-2" asChild>
            <a href={flow.buildWhatsappUrl()} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              Confirmer via WhatsApp
              <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-60" />
            </a>
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Envoyez le message WhatsApp avec la référence. L'administrateur prolongera votre licence
            et la caisse sera débloquée automatiquement au prochain contact.
          </p>
        </>
      )}

      <Button variant="ghost" className="w-full" onClick={() => flow.setStep(2)}>
        Retour au choix du chemin
      </Button>

      <Button variant="ghost" className="w-full" onClick={flow.handleClose}>
        Fermer
      </Button>
    </div>
  );
}
