import { getDB, startOfToday, touch } from "./internal";
import { listSalesToday } from "./sales";
import type { Sale } from "./types/sales";

export async function closeDay(): Promise<number> {
  const db = getDB();
  const sales = await listSalesToday();
  await db.transaction("rw", db.sales, db.day_closures, async () => {
    for (const s of sales) {
      if (!s.day_closed) await db.sales.put({ ...s, day_closed: true, ...touch() });
    }
    if (sales.length > 0) {
      // Une trace par jour, clé = minuit local : reclôturer le même jour remplace la
      // trace précédente au lieu d'en empiler une deuxième.
      const day = startOfToday();
      await db.day_closures.put({
        id: String(day),
        day,
        revenue: sales.reduce((sum, s) => sum + s.total, 0),
        sales_count: sales.length,
        closed_at: Date.now(),
      });
    }
  });
  return sales.length;
}

// ---------- Clôture automatique ----------
// La clôture manuelle (« Clôturer la journée ») reste disponible, mais une vente réglée
// se verrouille aussi d'elle-même 24 h après son encaissement : le commerce qui oublie
// de clôturer ne laisse pas des ventes annulables indéfiniment.
//
// Les additions ouvertes (`status: "open"`) échappent volontairement à cette règle : ce
// sont des « ventes non effectuées » qui roulent sur le jour suivant — l'argent n'est
// pas encore dans la caisse, elles ne sont donc ni verrouillées ni clôturées, et se
// régleront le jour où l'encaissement a lieu.

const AUTO_CLOSE_MS = 24 * 60 * 60 * 1000;

/** Vente verrouillée : clôturée à la main, ou encaissée il y a plus de 24 h. */
export function isClosed(sale: Sale): boolean {
  if (sale.day_closed) return true;
  if (sale.status === "open") return false;
  return sale.timestamp + AUTO_CLOSE_MS <= Date.now();
}

/**
 * Persiste la clôture automatique : marque `day_closed` sur les ventes réglées encaissées
 * il y a plus de 24 h. L'affichage s'appuie déjà sur `isClosed()`, qui lit l'heure — cette
 * écriture ne fait que rendre l'état durable dans la base (exports et sauvegardes inclus).
 * Sans objet quand il n'y a rien à clôturer : aucun écrit, donc aucun coût.
 */
export async function autoCloseDay(): Promise<void> {
  const db = getDB();
  const cutoff = Date.now() - AUTO_CLOSE_MS;
  const expired = (await db.sales.where("timestamp").below(cutoff).toArray()).filter(
    (s) => !s.deleted_at && !s.day_closed && s.status !== "open",
  );
  if (expired.length === 0) return;
  await db.transaction("rw", db.sales, async () => {
    for (const s of expired) {
      await db.sales.put({ ...s, day_closed: true, ...touch() });
    }
  });
}
