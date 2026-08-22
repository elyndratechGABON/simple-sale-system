// Écran de BLOCAGE DUR : monté dans la mise en page applicative, il recouvre toute
// l'application dès que le gatekeeper reçoit (ou a en mémoire) un statut « suspended ».
//
// Le store du verrou est synchronisé (`useSyncExternalStore`) pour réagir au handshake
// sans re-rendu superflu, et le verrou persiste dans IndexedDB : une caisse suspendue le
// reste même hors ligne, jusqu'à une prolongation livrée par le serveur.
import { useSyncExternalStore } from "react";
import { LockKeyhole, MonitorX } from "lucide-react";
import { getLockSnapshot, subscribeLock } from "@/lib/gatekeeper";
import { Button } from "@/components/ui/button";

// Lien WhatsApp du service client (à adapter si le numéro change).
const SUPPORT_WHATSAPP = "https://wa.me/24176505254";

export function SuspendedScreen() {
  // getServerSnapshot empêche l'erreur SSR "Missing getServerSnapshot" : côté serveur,
  // on rend non bloqué — le gatekeeper n'est monté qu'en/client.
  const { locked, reason } = useSyncExternalStore(subscribeLock, getLockSnapshot, () => ({
    locked: false,
    reason: null,
  }));
  if (!locked) return null;

  // Deux blocages, deux messages : le dépassement de quota n'est pas un impayé — la
  // caisse a bien payé, mais toutes les places du compte sont prises par d'autres écrans.
  const overLimit = reason === "device_limit";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          {overLimit ? (
            <MonitorX className="h-6 w-6 text-destructive" aria-hidden />
          ) : (
            <LockKeyhole className="h-6 w-6 text-destructive" aria-hidden />
          )}
        </div>
        <h1 className="text-lg font-semibold text-card-foreground">
          {overLimit ? "Limite d'appareils atteinte" : "Abonnement suspendu"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {overLimit
            ? "Toutes les places de votre abonnement sont utilisées par d'autres caisses. Passez à un palier supérieur ou libérez un appareil pour activer celle-ci."
            : "Votre abonnement a été suspendu. La caisse est bloquée tant que le renouvellement n'est pas enregistré."}
        </p>
        <Button asChild className="mt-6 w-full">
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
            Contacter le service client
          </a>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          {overLimit
            ? "Paliers : 10 000 F (2 appareils) · 25 000 F (4) · 50 000 F (8) / 30 jours."
            : "Renouvelez votre abonnement via WhatsApp, votre caisse sera relancée rapidement."}
        </p>
      </div>
    </div>
  );
}
