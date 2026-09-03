// Écran de BLOCAGE DUR : monté dans la mise en page applicative, il recouvre toute
// l'application dès que le gatekeeper reçoit (ou a en mémoire) un statut « suspended ».
//
// Le store du verrou est synchronisé (`useSyncExternalStore`) pour réagir au handshake
// sans re-rendu superflu, et le verrou persiste dans IndexedDB : une caisse suspendue le
// reste même hors ligne, jusqu'à une prolongation livrée par le serveur.
import { useSyncExternalStore, useState } from "react";
import { AlertTriangle, LockKeyhole, MonitorX, ScanLine } from "lucide-react";
import { getLockSnapshot, resetKeywordBlock, subscribeLock } from "@/lib/gatekeeper";
import { unlockFromPaymentSms } from "@/lib/offline-unlock";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Lien WhatsApp du service client (à adapter si le numéro change).
const SUPPORT_WHATSAPP = "https://wa.me/24176505254";

export function SuspendedScreen() {
  // getServerSnapshot empêche l'erreur SSR "Missing getServerSnapshot" : côté serveur,
  // on rend non bloqué — le gatekeeper n'est monté qu'en/client.
  const { locked, reason } = useSyncExternalStore(subscribeLock, getLockSnapshot, () => ({
    locked: false,
    reason: null,
  }));
  const [busy, setBusy] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [sms, setSms] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  if (!locked) return null;

  // Trois blocages, trois messages : le dépassement de quota n'est pas un impayé, et le
  // mot clé invalide est un rejet net des informations de reconnexion — jamais une dette.
  const overLimit = reason === "device_limit";
  const keywordInvalid = reason === "keyword_invalid";

  async function retryKeyword() {
    setBusy(true);
    try {
      await resetKeywordBlock();
    } finally {
      setBusy(false);
    }
  }

  /** Déblocage OFFLINE : colle le SMS de confirmation de l'opérateur → levée immédiate. */
  async function handleOfflineUnlock() {
    if (!sms.trim() || unlocking) return;
    setUnlocking(true);
    try {
      const result = await unlockFromPaymentSms(sms.trim());
      if (result.ok && result.receipt) {
        toast.success(`Abonnement ${result.receipt.planName} débloqué hors ligne`, {
          description: `Reçu ${result.receipt.amount.toLocaleString("fr-FR")} F — confirmation serveur au prochain contact.`,
        });
        setSms("");
        setUnlockOpen(false);
      } else {
        const messages: Record<string, string> = {
          not_a_payment_sms: "Ce texte ne ressemble pas à un SMS de confirmation de paiement.",
          no_matching_tier: "Le montant ne correspond à aucun palier (10 000 / 25 000 / 50 000 F).",
        };
        toast.error(
          messages[result.reason ?? "unknown"] ?? "Impossible de déverrouiller à partir de ce SMS.",
        );
      }
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          {overLimit ? (
            <MonitorX className="h-6 w-6 text-destructive" aria-hidden />
          ) : keywordInvalid ? (
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
          ) : (
            <LockKeyhole className="h-6 w-6 text-destructive" aria-hidden />
          )}
        </div>
        <h1 className="text-lg font-semibold text-card-foreground">
          {keywordInvalid
            ? "Mot clé de récupération invalide"
            : overLimit
              ? "Limite d'appareils atteinte"
              : "Abonnement suspendu"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {keywordInvalid
            ? "Aucun compte ne correspond à ce nom de boutique, ce propriétaire et ce mot clé. Vérifiez vos informations ou contactez le service client pour récupérer votre compte."
            : overLimit
              ? "Toutes les places de votre abonnement sont utilisées par d'autres caisses. Passez à un palier supérieur ou libérez un appareil pour activer celle-ci."
              : "Votre abonnement a été suspendu. La caisse est bloquée tant que le renouvellement n'est pas enregistré."}
        </p>
        {keywordInvalid ? (
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={retryKeyword} disabled={busy}>
              {busy ? "Vérification…" : "Réessayer"}
            </Button>
            <Button asChild variant="outline">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
                Contacter le service client
              </a>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => setUnlockOpen((v) => !v)}>
                <ScanLine className="h-4 w-4" />
                J'ai un SMS de confirmation — débloquer
              </Button>
              <Button asChild variant="outline">
                <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
                  Contacter le service client
                </a>
              </Button>
            </div>

            {unlockOpen && (
              <div className="mt-3 space-y-3">
                <textarea
                  className="w-full min-h-20 rounded-lg border bg-input px-3 py-2 text-sm"
                  placeholder={
                    'Collez le SMS reçu de l\'opérateur, ex : "Recu 10000F du 076505254,Client. … TID: …."'
                  }
                  value={sms}
                  onChange={(e) => setSms(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  L'app reconnaît le montant et le TID, puis déverrouille immédiatement — même hors
                  ligne.
                </p>
                <Button
                  className="w-full"
                  disabled={!sms.trim() || unlocking}
                  onClick={() => void handleOfflineUnlock()}
                >
                  {unlocking ? "Vérification…" : "Déverrouiller maintenant"}
                </Button>
              </div>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {overLimit
            ? "Paliers : 10 000 F (3 écrans) · 25 000 F (5) · 50 000 F (9) / 30 jours."
            : keywordInvalid
              ? "Préparez le mot clé reçu à la création du compte (format XXXX-XXXX)."
              : "Renouvelez votre abonnement via WhatsApp, votre caisse sera relancée rapidement."}
        </p>
      </div>
    </div>
  );
}
