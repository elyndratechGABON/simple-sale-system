import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { refreshAccountQuota } from "@/lib/gatekeeper/account";
import { parsePaymentSms } from "@/lib/payments/sms-parser";

export function VerifyPaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [sms, setSms] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleVerify() {
    if (!sms.trim() || verifying) return;
    setVerifying(true);
    setMessage(null);
    try {
      const parsed = parsePaymentSms(sms);
      if (!parsed) {
        setMessage("Ce texte ne ressemble pas à un SMS de confirmation de paiement.");
        toast.error("SMS non reconnu");
        return;
      }

      // Appel API de confirmation du paiement
      const res = await fetch("/api/v1/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed.amount,
          tid: parsed.tid,
          phone: parsed.phone,
          name: parsed.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? "Erreur lors de la vérification du paiement.");
        toast.error("Échec de la vérification");
        return;
      }

      const data = await res.json();
      setMessage(data.message ?? "Paiement confirmé");

      // Rafraîchir le quota du compte
      await refreshAccountQuota();

      toast.success("Paiement vérifié et confirmé", {
        description: `Montant : ${parsed.amount.toLocaleString("fr-FR")} F — Transaction ${parsed.tid}`,
      });

      setSms("");
      onOpenChange(false);
    } catch (e) {
      setMessage("Erreur inattendue lors de la vérification.");
      toast.error("Erreur inattendue");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérifier un paiement par SMS</DialogTitle>
          <DialogDescription>Collez le SMS de confirmation reçu de l'opérateur</DialogDescription>
        </DialogHeader>

        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? "Collez le SMS ci-dessous et appuyez sur Vérifier"}
        </p>

        <textarea
          className="w-full min-h-20 rounded-lg border bg-input px-3 py-2 text-sm mb-3"
          placeholder="Collez le SMS reçu de l'opérateur, ex : 'Recu 10000F du 076505254,Client. Nouveau solde 1148.6F. TID: PP260818.1345.D05428.'"
          value={sms}
          onChange={(e) => setSms(e.target.value)}
          rows={3}
        />

        <div className="flex gap-2 mt-4">
          <Button disabled={verifying || !sms.trim()} onClick={handleVerify}>
            {verifying ? "Vérification…" : "Vérifier"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
        </div>

        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </DialogContent>
    </Dialog>
  );
}
