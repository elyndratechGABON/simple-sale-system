// Deux effets de démarrage qui doivent tourner sur TOUTE l'application, indépendamment
// de la page ouverte : l'enregistrement du service worker (sans lui, pas de précache,
// donc pas d'application hors ligne) et la demande de stockage persistant (sans elle, le
// navigateur peut évincer IndexedDB — c'est-à-dire l'historique des ventes — sous
// pression disque).
//
// Ce composant ne rend rien. Il remplace l'ancien PwaInstall, dont le bouton flottant
// recouvrait le coin bas-droit de chaque page, « Valider la vente » comprise. Le chemin
// d'installation vit maintenant sur la landing (`src/routes/index.tsx`) et dans les
// paramètres, via le hook `usePwaInstall`.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  registerServiceWorker,
  requestPersistentStorage,
  UPDATE_EVENT,
  type UpdateAvailableDetail,
} from "@/lib/pwa";
import { autoCloseDay } from "@/lib/db";
import { backgroundSync } from "@/lib/sync";
import { loadLockState } from "@/lib/gatekeeper";
import { unlockFromPaymentSms } from "@/lib/offline-unlock";
import { clearSharedSmsUrl, extractSharedSms } from "@/lib/payments/share-target";
import { withRetry } from "@/lib/syncengine/retry";
import { toast } from "sonner";

// Relance de la synchronisation d'arrière-plan : toutes les minutes tant que l'app est
// ouverte. C'est elle qui fait arriver les données quand le PC du commerçant s'allume
// après la caisse — l'échec d'une tentative ne condamne pas l'envoi.
// Surchargé : retry avec backoff pour résister au load.
const SYNC_INTERVAL_MS = 60_000;

// Préfixes de requêtes alimentées par la convergence P2P (relais). Quand un tick a
// appliqué ou poussé des ops, on les invalide pour que les écrans (stock, ventes,
// appareils) affichent la donnée arriver sans recharger la page.
const SYNCED_QUERY_KEYS: string[][] = [
  ["products"],
  ["sales"],
  ["open_tables"],
  ["clients"],
  ["paired_devices"],
];

export function PwaBootstrap() {
  const queryClient = useQueryClient();
  // Mise à jour disponible : l'application tourne sur un bundle périmé. Le service
  // worker nouveau EST installé mais attend — on propose le rechargement, qui est le
  // seul moyen d'obtenir le nouveau code (le JavaScript déjà chargé reste l'ancien).
  // Sans ce signal, un téléphone peut rester des heures sur une version périmée sans
  // que rien ne le montre.
  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UpdateAvailableDetail>).detail;
      toast("Nouvelle version disponible", {
        description: "Rechargez l'application pour être à jour.",
        action: { label: "Recharger", onClick: () => detail.apply() },
        duration: Infinity,
      });
    };
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate);
  }, []);
  useEffect(() => {
    registerServiceWorker();
    requestPersistentStorage();
    // Le commerçant a PARTAGÉ son reçu de paiement avec l'application (« Partager »
    // dans l'appli SMS de l'opérateur). Le texte arrive par l'URL (cf. le manifeste) :
    // on le traite exactement comme un SMS collé — il déverrouille la caisse et part
    // signé vers l'orchestrateur.
    const partage = extractSharedSms(window.location.search);
    if (partage) {
      clearSharedSmsUrl();
      void unlockFromPaymentSms(partage).then((res) => {
        if (res.ok) {
          toast.success("Reçu de paiement reçu", {
            description:
              "Votre paiement est enregistré et transmis. L'abonnement sera validé sous peu.",
          });
        } else {
          toast.error("Ce message n'est pas un reçu de paiement", {
            description: "Partagez le SMS de confirmation reçu de votre opérateur (montant, TID).",
          });
        }
      });
    }
    // Clôture automatique : les ventes encaissées il y a plus de 24 h passent
    // `day_closed` à chaque démarrage. L'affichage s'appuie sur `isClosed()`, qui lit
    // l'heure, donc ce n'est pas ce qui verrouille ; c'est ce qui rend l'état durable.
    autoCloseDay();
    // Restaure un éventuel verrou de suspension persisté (AVANT le handshake, pour que
    // la caisse reste bloquée même sans réseau), puis synchronise en silence : hors
    // ligne ou serveur éteint, rien ne se passe et on réessaiera — au retour en ligne et
    // toutes les minutes.
    const sync = async () => {
      // Retry avec backoff exponentiel pour résister au load surchargé
      await withRetry(async () => {
        const changed = await backgroundSync();
        if (changed) {
          for (const key of SYNCED_QUERY_KEYS) {
            await queryClient.invalidateQueries({ queryKey: key });
          }
        }
      });
    };
    void loadLockState().then(() => sync());
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    const interval = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}
