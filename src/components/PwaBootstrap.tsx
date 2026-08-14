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
import { registerServiceWorker, requestPersistentStorage } from "@/lib/pwa";
import { autoCloseDay } from "@/lib/db";
import { backgroundSync } from "@/lib/sync";
import { loadLockState } from "@/lib/gatekeeper";

// Relance de la synchronisation d'arrière-plan : toutes les minutes tant que l'app est
// ouverte. C'est elle qui fait arriver les données quand le PC du commerçant s'allume
// après la caisse — l'échec d'une tentative ne condamne pas l'envoi.
const SYNC_INTERVAL_MS = 60_000;

export function PwaBootstrap() {
  useEffect(() => {
    registerServiceWorker();
    requestPersistentStorage();
    // Clôture automatique : les ventes encaissées il y a plus de 24 h passent
    // `day_closed` à chaque démarrage. L'affichage s'appuie sur `isClosed()`, qui lit
    // l'heure, donc ce n'est pas ce qui verrouille ; c'est ce qui rend l'état durable.
    autoCloseDay();
    // Restaure un éventuel verrou de suspension persisté (AVANT le handshake, pour que
    // la caisse reste bloquée même sans réseau), puis synchronise en silence : hors
    // ligne ou serveur éteint, rien ne se passe et on réessaiera — au retour en ligne et
    // toutes les minutes.
    void loadLockState().then(() => backgroundSync());
    const onOnline = () => void backgroundSync();
    window.addEventListener("online", onOnline);
    const interval = window.setInterval(() => void backgroundSync(), SYNC_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
