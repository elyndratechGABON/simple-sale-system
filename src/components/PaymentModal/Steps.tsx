import { BadgeCheck, CreditCard, MessageCircle, ScanLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PlanInfo } from "@/lib/pricing";
import type { PaymentFlow } from "./usePaymentFlow";

const USSD_CODE = "*110#";

/** Étape 1 — compose le code USSD de paiement. */
export function StepUssd({
  selectedPlan,
  onPaid,
}: {
  selectedPlan?: PlanInfo | null;
  onPaid: () => void;
}) {
  return (
    <>
      {selectedPlan && (
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
        <Button className="w-full" onClick={onPaid}>
          J'ai effectué le paiement
        </Button>
      </div>
    </>
  );
}

/** Étape 2 — choix du chemin de confirmation. */
export function StepChooseMethod({
  onOffline,
  onAdmin,
  onBack,
}: {
  onOffline: () => void;
  onAdmin: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choisissez comment confirmer ce paiement :</p>

      <div className="rounded-lg border bg-accent/50 p-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Déblocage immédiat, hors ligne
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Idéal quand l'orchestrateur (sur votre PC) est éteint : collez le SMS de confirmation reçu
          de l'opérateur, la caisse déverrouille sur place.
        </p>
        <Button className="mt-3 w-full" onClick={onOffline}>
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
          La demande part au serveur, l'administrateur la valide en un clic depuis son tableau de
          bord (ou via WhatsApp en secours).
        </p>
        <Button variant="outline" className="mt-3 w-full" onClick={onAdmin}>
          Passer par l'administrateur
        </Button>
      </div>

      <Button variant="ghost" className="w-full" onClick={onBack}>
        Retour
      </Button>
    </div>
  );
}

/** Étape 4 — déblocage hors ligne à partir du SMS de l'opérateur. */
export function StepOfflineSms({ flow }: { flow: PaymentFlow }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment-sms">SMS de confirmation de l'opérateur</Label>
        <textarea
          id="payment-sms"
          className="w-full min-h-24 rounded-lg border bg-input px-3 py-2 text-sm"
          placeholder={
            'Collez ici le SMS reçu, ex : "Recu 10000F du 076505254,Client. Nouveau solde … TID: …."'
          }
          value={flow.smsText}
          onChange={(e) => flow.setSmsText(e.target.value)}
          rows={4}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          L'app extrait le montant et le TID, vérifie le palier, puis déverrouille immédiatement —
          même sans serveur.
        </p>
      </div>

      {flow.unlockedPlan ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Abonnement <strong>{flow.unlockedPlan}</strong> débloqué. Le prochain appel au serveur
            (au retour en ligne) confirmera définitivement.
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => flow.setStep(2)} className="flex-1">
            Retour
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!flow.smsText.trim() || flow.unlocking}
            onClick={() => void flow.handleOfflineUnlock()}
          >
            <ScanLine className="h-4 w-4" />
            {flow.unlocking ? "Vérification…" : "Déverrouiller"}
          </Button>
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={flow.handleClose}>
        Fermer
      </Button>
    </div>
  );
}
