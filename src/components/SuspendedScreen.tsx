// Écran de BLOCAGE DUR : monté dans la mise en page applicative, il recouvre toute
// l'application dès que le gatekeeper reçoit (ou a en mémoire) un statut « suspended ».
//
// Le store du verrou est synchronisé (`useSyncExternalStore`) pour réagir au handshake
// sans re-rendu superflu, et le verrou persiste dans IndexedDB : une caisse suspendue le
// reste même hors ligne, jusqu'à une prolongation livrée par le serveur.
import { useSyncExternalStore } from "react";
import { LockKeyhole } from "lucide-react";
import { getLockSnapshot, subscribeLock } from "@/lib/gatekeeper";
import { Button } from "@/components/ui/button";

// Lien WhatsApp du service client (à adapter si le numéro change).
const SUPPORT_WHATSAPP = "https://wa.me/24176505254";

export function SuspendedScreen() {
  // getServerSnapshot empêche l'erreur SSR "Missing getServerSnapshot" : côté serveur,
  // on rend false (non bloqué) — le gatekeeper n'est monté qu'en/client.
  const locked = useSyncExternalStore(subscribeLock, getLockSnapshot, () => false);
  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <LockKeyhole className="h-6 w-6 text-destructive" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-card-foreground">Abonnement suspendu</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre abonnement a été suspendu. La caisse est bloquée tant que le renouvellement n'est
          pas enregistré.
        </p>
        <Button asChild className="mt-6 w-full">
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
            Contacter le service client
          </a>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Renouvelez votre abonnement via WhatsApp, votre caisse sera relancée rapidement.
        </p>
      </div>
    </div>
  );
}
