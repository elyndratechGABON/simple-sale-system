// Écran de BLOCAGE DUR : monté dans la mise en page applicative, il recouvre toute
// l'application dès que le gatekeeper reçoit (ou a en mémoire) un statut « suspended ».
//
// Le store du verrou est synchronisé (`useSyncExternalStore`) pour réagir au handshake
// sans re-rendu superflu, et le verrou persiste dans IndexedDB : une caisse suspendue le
// reste même hors ligne, jusqu'à une prolongation livrée par le serveur.
import { useSyncExternalStore, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Fingerprint,
  LockKeyhole,
  MonitorX,
  ScanLine,
  Store,
} from "lucide-react";
import {
  getLockSnapshot,
  resetDeviceConflict,
  resetKeywordBlock,
  resetGatekeeper,
  subscribeLock,
} from "@/lib/gatekeeper";
import { VerifyPaymentDialog } from "@/features/settings/VerifyPaymentDialog";
import { reattachAccount } from "@/lib/gatekeeper";
import { departFromGroup } from "@/lib/syncengine/pairing";
import { purgeAllData } from "@/lib/db";
import { resetDeviceIdentity } from "@/lib/syncengine/identity";
import { savePreferences } from "@/lib/settings";
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
  // Réassociation du compte (blocage « appareil déjà enregistré »).
  const [reattachOpen, setReattachOpen] = useState(false);
  const [reattachPhone, setReattachPhone] = useState("");
  const [reattachPassword, setReattachPassword] = useState("");
  if (!locked) return null;

  // Quatre blocages, quatre messages : le dépassement de quota n'est pas un impayé, le
  // mot clé invalide est un rejet net des informations de reconnexion — jamais une dette,
  // et le conflit d'empreinte n'est ni un impayé ni une erreur de l'utilisateur.
  const overLimit = reason === "device_limit";
  const keywordInvalid = reason === "keyword_invalid";
  const deviceConflict = reason === "device_conflict";
  // EXPIRÉ : la période de grâce (3 jours) est passée sans paiement. Ce n'est pas une
  // suspension (une décision d'Elyndra) : c'est la fin de la tolérance.
  const expired = reason === "expired";

  async function retryKeyword() {
    setBusy(true);
    try {
      await resetKeywordBlock();
    } finally {
      setBusy(false);
    }
  }

  async function retryDeviceConflict() {
    setBusy(true);
    try {
      await resetDeviceConflict();
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveAndReset() {
    setBusy(true);
    try {
      await departFromGroup();
      await purgeAllData();
      await resetDeviceIdentity();
      resetGatekeeper();
      savePreferences({ onboarded: false });
      window.location.reload();
    } catch {
      toast.error("Impossible de libérer cet appareil.");
    } finally {
      setBusy(false);
    }
  }

  /** Réassociation : le téléphone + le mot de passe du compte rendent son poste. */
  async function handleReattach() {
    setBusy(true);
    try {
      const result = await reattachAccount(reattachPhone, reattachPassword);
      if (result.ok) {
        setReattachOpen(false);
        setReattachPassword("");
        toast.success("Compte rattaché", {
          description: "Cet écran a repris sa place dans votre commerce.",
        });
      } else {
        toast.error(result.error ?? "Rattachement impossible.");
      }
    } finally {
      setBusy(false);
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
          ) : deviceConflict ? (
            <Fingerprint className="h-6 w-6 text-destructive" aria-hidden />
          ) : expired ? (
            <Clock className="h-6 w-6 text-destructive" aria-hidden />
          ) : (
            <LockKeyhole className="h-6 w-6 text-destructive" aria-hidden />
          )}
        </div>
        <h1 className="text-lg font-semibold text-card-foreground">
          {keywordInvalid
            ? "Mot clé de récupération invalide"
            : deviceConflict
              ? "Cet appareil est déjà enregistré"
              : overLimit
                ? "Limite d'appareils atteinte"
                : expired
                  ? "Abonnement expiré"
                  : "Abonnement suspendu"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {keywordInvalid
            ? "Aucun compte ne correspond à ce nom de boutique, ce propriétaire et ce mot clé. Vérifiez vos informations ou contactez le service client pour récupérer votre compte."
            : deviceConflict
              ? "Un seul appareil physique peut correspondre à une boutique, et le serveur a retrouvé celui-ci déjà rattaché à une autre inscription. Vos données locales sont intactes et la caisse continue de fonctionner hors ligne : c'est la synchronisation qui attend. Contactez le service client pour rattacher cette caisse à votre boutique."
              : overLimit
                ? "Toutes les places de votre abonnement sont utilisées par d'autres caisses. Passez à un palier supérieur ou libérez un appareil pour activer celle-ci."
                : expired
                  ? "Votre abonnement a atteint son échéance et la période de grâce de 3 jours est passée. La caisse est bloquée tant que le renouvellement n'est pas enregistré — vos données locales sont intactes."
                  : "Votre abonnement a été suspendu. La caisse est bloquée tant que le renouvellement n'est pas enregistré."}
        </p>
        {deviceConflict ? (
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={retryDeviceConflict} disabled={busy}>
              {busy ? "Vérification…" : "Réessayer"}
            </Button>
            {/* Réassociation : la fiche locale a été purgée (suppression, réinstallation)
                et les identifiants du compte ont disparu avec elle. Le téléphone + le
                mot de passe du compte rendent à l'écran SON propre poste. */}
            <Button variant="outline" onClick={() => setReattachOpen(true)} disabled={busy}>
              <Store className="h-4 w-4" />
              Réassocier mon compte
            </Button>
            <Button asChild variant="outline">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
                Contacter le service client
              </a>
            </Button>
            {reattachOpen && (
              <div className="mt-3 space-y-2 rounded-lg border p-3 text-left">
                <p className="text-xs text-muted-foreground">
                  Le téléphone et le mot de passe du compte marchand (c ceux de la boutique). Le
                  serveur laissera cet écran reprendre sa place.
                </p>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Téléphone du compte"
                  value={reattachPhone}
                  onChange={(e) => setReattachPhone(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Mot de passe du compte"
                  value={reattachPassword}
                  onChange={(e) => setReattachPassword(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={busy || !reattachPhone.trim() || reattachPassword.length < 4}
                  onClick={() => void handleReattach()}
                >
                  {busy ? "Rattachement…" : "Rattacher ce téléphone"}
                </Button>
              </div>
            )}
          </div>
        ) : keywordInvalid ? (
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
        ) : overLimit ? (
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => void handleLeaveAndReset()}
              disabled={busy}
            >
              {busy ? "Libération…" : "Libérer cet appareil (Recommencer)"}
            </Button>
            <Button asChild variant="outline">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
                Contacter le service client
              </a>
            </Button>
          </div>
        ) : (
          <>
            <VerifyPaymentDialog open={false} onOpenChange={() => {}} />
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {overLimit
            ? "Paliers : 10 000 F (3 écrans) · 25 000 F (5) · 50 000 F (9) / 30 jours."
            : keywordInvalid
              ? "Préparez le mot clé reçu à la création du compte (format XXXX-XXXX)."
              : deviceConflict
                ? "La caisse vend et enregistre normalement — seule la synchronisation avec le serveur est suspendue."
                : "Renouvelez votre abonnement via WhatsApp, votre caisse sera relancée rapidement."}
        </p>
      </div>
    </div>
  );
}
