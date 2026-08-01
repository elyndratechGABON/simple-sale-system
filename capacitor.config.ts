import type { CapacitorConfig } from "@capacitor/cli";

// Enveloppe native Android. Raison d'être : sur téléphone, une PWA ne peut pas obtenir de
// dossier permanent — le File System Access API (`showDirectoryPicker`) n'existe ni sur
// Chrome Android, ni sur Firefox Android, ni sur Safari iOS. Le plugin Filesystem de
// Capacitor est le seul moyen d'écrire réellement dans Documents. Voir src/lib/files.ts.
const config: CapacitorConfig = {
  appId: "ga.elyndra.caisse",
  appName: "Caisse",
  // Produit par `npm run build:static` (vite.config.static.ts), PAS par `npm run build` :
  // le build de production reste un serveur SSR pour Cloudflare et n'écrit aucun
  // index.html. Toujours relancer build:static avant `npx cap sync`.
  webDir: "dist/client",
};

export default config;
