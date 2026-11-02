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
  persistedStorageStatus,
  UPDATE_EVENT,
  type UpdateAvailableDetail,
} from "@/lib/pwa";
import { autoCloseDay } from "@/lib/db";
import { ensureFinancialSnapshot } from "@/lib/financial/archives";
import { backgroundSync } from "@/lib/sync";
import { runCriticalOpsExchange, CRITICAL_INTERVAL_MS } from "@/lib/sync/ops";
import { loadLockState } from "@/lib/gatekeeper";
import { unlockFromPaymentSms } from "@/lib/offline-unlock";
import { clearSharedSmsUrl, extractSharedSms } from "@/lib/payments/share-target";
import { withRetry } from "@/lib/syncengine/retry";
import { purgeOutboxEmergency } from "@/lib/syncengine/outbox";
import { migrateLegacyPhotos } from "@/lib/images";
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
    // STOCKAGE PERSISTANT (mission mémoire — Étape 4) : `persist()` est demandé au
    // boot ; le log dit clairement si le navigateur protège les données (IndexedDB
    // non évincable sous pression disque) — c'est la première pierre de la stabilité.
    void requestPersistentStorage().then((granted) => {
      console.log("Stockage persistant :", granted ? "Accordé" : "Refusé");
    });
    // Vérifie stockage persistant au démarrage : si l'utilisateur accepte, les données
    // (historique des ventes, paramètres) ne seront plus évincées par le navigateur.
    void persistedStorageStatus().then((s) => {
      if (s === "persisted") {
        toast("Stockage sécurisé activé", {
          description: "Vos données sont protégées même en cas de pression disque.",
          duration: 5000,
        });
      }
    });
    // PURGE D'URGENCE DE L'OUTBOX (mission anti-crash — Étape 1) : au-delà de 200 ops
    // (3746 ops = 173 Mo avec les photos), le démarrage crashait en chargeant tout en
    // RAM. Avant LA PREMIÈRE synchronisation : on ne garde que les 50 dernières ops,
    // le boot redevient instantané. Best-effort : un échec de purge ne bloque rien.
    void purgeOutboxEmergency().catch((e) =>
      console.error("[boot] purge d'urgence de l'outbox échouée :", e),
    );
    // Archives financières automatiques (mission archives — Étape 3) : au boot, si le
    // DERNIER snapshot date d'au moins la fréquence choisie, la journée écoulée est
    // archivée. Best-effort : le boot ne doit JAMAIS être bloqué par l'archivage.
    void ensureFinancialSnapshot().catch(() => {});
    // Migration photos legacy (audit OOM — Étape 2) : re-encode les dataURL non-JPEG
    // (ancien webp 256 px) vers la charte 500 px / JPEG 0.7, produit et variantes.
    // Une seule fois par appareil (flag localStorage), fire-and-forget : le boot
    // n'attend pas — mais l'invalidation rafraîchit l'affichage si des photos ont changé.
    const PHOTO_MIGRATION_KEY = "photo_migration_500_jpeg";
    if (!globalThis.localStorage.getItem(PHOTO_MIGRATION_KEY)) {
      void migrateLegacyPhotos()
        .then((n) => {
          globalThis.localStorage.setItem(PHOTO_MIGRATION_KEY, "1");
          if (n > 0) void queryClient.invalidateQueries({ queryKey: ["products"] });
        })
        .catch(() => {});
    }
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
    // VOIE RAPIDE : toutes les SECONDES, pousser ce qui est critique (ventes,
    // stock, réservations) sans attendre la minute — coût zéro hors file critique.
    const fastInterval = window.setInterval(() => {
      void runCriticalOpsExchange().then((state) => {
        if (state && (state.pushed > 0 || state.applied > 0)) {
          for (const key of SYNCED_QUERY_KEYS) {
            void queryClient.invalidateQueries({ queryKey: key });
          }
        }
      });
    }, CRITICAL_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
      window.clearInterval(fastInterval);
    };
  }, [queryClient]);

  return null;
}
