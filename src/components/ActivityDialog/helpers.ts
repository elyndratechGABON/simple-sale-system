/** Début du mois courant (fenêtre par défaut). */
export function monthStart(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nom humain d'un vendeur sans nom posé. */
export function sellerDisplay(name?: string, fallback: string = "Direct"): string {
  return name?.trim() ? name : fallback;
}

/** Dernier contact en texte relatif. */
export function lastSeenLabel(ts?: number): string {
  if (!ts) return "Jamais";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return `Il y a ${Math.floor(diff / 86_400_000)} j`;
}
