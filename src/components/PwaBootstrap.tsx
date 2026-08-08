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

export function PwaBootstrap() {
  useEffect(() => {
    registerServiceWorker();
    requestPersistentStorage();
  }, []);

  return null;
}
