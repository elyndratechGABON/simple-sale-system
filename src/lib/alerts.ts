// Moteur d'alertes du tableau de bord.
//
// Contrat : fonction PURE, comme src/lib/analytics.ts — ni IndexedDB ni React. Elle
// reçoit le catalogue et les additions ouvertes déjà chargés, et déduit ce qui mérite
// l'attention du gérant. Rien de plus : pas de rendez-vous (fonction inexistante), pas
// d'état stocké — une alerte qui ne reflète que les données ne peut pas mentir.
import type { Product, Rental, Sale } from "./db";

export type AlertSeverity = "danger" | "warning" | "info";

export interface AppAlert {
  /** Identifiant stable tant que la situation persiste — sert à marquer « vu ». */
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  to: "/stocks" | "/pos";
}

/** Seuil « stock faible » par défaut, quand le produit n'en définit pas lui-même. */
export const LOW_STOCK_THRESHOLD = 5;

const SEVERITY_ORDER: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };

/**
 * Alertes contextuelles, triées par gravité :
 *  - danger  : rupture de stock (0 en réserve) ;
 *  - warning : stock faible (≤ seuil du produit, sinon seuil global) ;
 *  - info    : additions de table non réglées — l'argent n'est pas encore en caisse ;
 *  - danger  : locations en retard (actif non retourné après la date prévue).
 *
 * Le stock illimité (`Number.POSITIVE_INFINITY`) ne déclenche rien : un produit vendu
 * à la demande n'a pas de rupture possible.
 */
export function buildAlerts(
  products: Product[],
  openTables: Sale[],
  rentals?: Rental[],
): AppAlert[] {
  const alerts: AppAlert[] = [];

  for (const p of products) {
    // Une prestation n'a pas de réserve : un service ne déclenche ni rupture ni seuil.
    if (p.type === "service") continue;
    if (p.stock === Number.POSITIVE_INFINITY) continue;
    if (p.stock <= 0) {
      alerts.push({
        id: `rupture:${p.id}`,
        severity: "danger",
        title: p.name,
        detail: "Rupture de stock",
        to: "/stocks",
      });
    } else {
      const threshold =
        typeof p.min_stock === "number" && p.min_stock > 0 ? p.min_stock : LOW_STOCK_THRESHOLD;
      if (p.stock <= threshold) {
        alerts.push({
          id: `low-stock:${p.id}`,
          severity: "warning",
          title: p.name,
          detail:
            threshold === LOW_STOCK_THRESHOLD
              ? `Stock faible : ${p.stock} restant${p.stock > 1 ? "s" : ""}`
              : `Stock faible : ${p.stock} restant${p.stock > 1 ? "s" : ""} (seuil ${threshold})`,
          to: "/stocks",
        });
      }
    }
  }

  if (openTables.length > 0) {
    const labels = openTables.map((t) => t.table ?? "Comptoir").join(", ");
    alerts.push({
      id: "open-tables",
      severity: "info",
      title:
        openTables.length === 1 ? "1 addition en cours" : `${openTables.length} additions en cours`,
      detail: labels,
      to: "/pos",
    });
  }

  // Locations en retard
  if (rentals && rentals.length > 0) {
    const now = Date.now();
    const overdue = rentals.filter((r) => r.status === "active" && r.expected_end_date < now);
    if (overdue.length > 0) {
      const names = overdue.map((r) => r.asset_name).join(", ");
      alerts.push({
        id: "overdue-rentals",
        severity: "danger",
        title:
          overdue.length === 1 ? "1 location en retard" : `${overdue.length} locations en retard`,
        detail: names,
        to: "/pos",
      });
    }
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
