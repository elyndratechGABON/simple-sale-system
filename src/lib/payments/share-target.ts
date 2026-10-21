// Le partage du SMS de paiement vers l'application.
//
// ⚠️ Vérité technique, à ne pas survendre : une PWA ne peut PAS lire la boîte de
// réception SMS. Ni sur Android, ni sur iPhone — c'est une permission native, et
// Apple l'interdit structurellement aux apps tierces. La capture automatique DU
// CONTENU DE LA BOÎTE n'existe donc pas, en web.
//
// Ce qui existe, et qui marche sur les DEUX plateformes : le PARTAGE. Le commerçant
// ouvre le SMS de l'opérateur, tape « Partager », choisit l'application : le texte
// arrive ici, en un geste (au lieu de copier-coller). C'est ce que le manifeste
// déclare (`share_target`), en GET — donc sans fonction serveur : le texte passe par
// l'URL, et l'application le lit au démarrage.
//
// Le reste du chemin est commun avec le collage : le texte est parse, il déverrouille
// la caisse si le paiement est confirmé, et il part SIGNÉ vers l'orchestrateur.

/**
 * Le SMS partagé, s'il y en a un.
 *
 * Le manifeste déclare `text` et `title` : certains systèmes d'exploitation mettent le
 * contenu dans l'un, d'autres dans l'autre — on prend les deux.
 */
export function extractSharedSms(search: string): string | null {
  const params = new URLSearchParams(search);
  const brut = (params.get("text") ?? params.get("title") ?? "").trim();
  return brut.length > 0 ? brut : null;
}

/**
 * Le lien de partage a-t-il été consommé ?
 *
 * On retire les paramètres de l'URL après usage : sans cela, recharger la page
 * renverrait le même SMS (et le signalerait une seconde fois).
 */
export function clearSharedSmsUrl(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  let change = false;
  for (const cle of ["text", "title"]) {
    if (url.searchParams.has(cle)) {
      url.searchParams.delete(cle);
      change = true;
    }
  }
  if (change) window.history.replaceState({}, "", url.toString());
}
