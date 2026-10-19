/**
 * Grille d'un mois civil : 6 semaines × 7 jours, chaque cellule alignée sur son jour
 * local (minuit). Semaine du lundi. Les cellules hors mois appartiennent au mois
 * précédent ou suivant : elles ne servent qu'à donner à la grille une hauteur constante
 * (pas de saut de mise en page entre un mois long et un mois court).
 */
export interface MonthCell {
  ts: number;
  inMonth: boolean;
}

export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // lundi = 0
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first);
    d.setDate(1 + (i - lead));
    return {
      ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      inMonth: d.getMonth() === month,
    };
  });
}
