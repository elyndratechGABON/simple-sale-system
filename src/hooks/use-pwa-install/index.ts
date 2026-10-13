// État d'installabilité de la PWA — STORE PARTAGÉ entre tous les composants.
//
// Pourquoi un singleton et pas un état par hook : la landing affiche TROIS
// « Installer » (header compact, hero, section finale), chaque <InstallCta>
// montait son propre usePwaInstall. L'événement `beforeinstallprompt` n'est
// consommable qu'UNE fois : au premier geste, chaque instance appelait
// prompt() sur le même objet — une réussissait (la première montée, donc le
// header), les autres étaient rejetées par Chrome → « unavailable » → le
// bouton du hero ouvrait invariablement le message de repli. Désormais un
// seul état vit au niveau du module (store.ts) : un seul écouteur de geste,
// une seule consommation, tous les boutons reflètent la même réalité.
//
// (types.ts) rien n'est évalué pendant le rendu serveur ; (install.ts) le flux
// d'installation ; (usePwaInstall.ts) le hook public.
export { usePwaInstall } from "./usePwaInstall";
export type { InstallOutcome, PwaInstallState } from "./types";
