// L'ÉTAT d'abonnement d'un commerce — la règle métier qui décide de ce que le
// commerçant lit dans « Paramètres → Compte → Abonnement ».
//
// Pure : elle ne lit ni la base ni le réseau. C'est le serveur qui dit si le compte
// est en essai (jamais payé) et quel palier il a ; cette fonction ne fait que
// traduire ces faits + l'échéance en un texte lisible.

export type AbonnementEtat =
  | { kind: "grace"; heures: number }
  | { kind: "expire" }
  | { kind: "essai"; jours: number }
  | { kind: "bientot"; jours: number }
  | { kind: "actif" };

export interface AbonnementContexte {
  /** Jours restants avant l'échéance (0 = échu). */
  joursRestants: number;
  /** Le serveur a signalé une période de grâce active. */
  enGrace: boolean;
  /** Heures restantes dans la grâce. */
  heuresGrace: number;
  /** Le compte n'a jamais payé : c'est un essai. */
  essai: boolean;
}

/**
 * L'état affiché, par ordre de gravité décroissante.
 *
 * La GRÂCE passe avant l'essai : un compte échu mais en grâce n'est pas un « essai »,
 * c'est un compte qui a payé et dont l'échéance est passée (le commerçant doit le
 * voir, et savoir qu'il lui reste des heures, pas des jours d'essai).
 */
export function etatAbonnement(ctx: AbonnementContexte): AbonnementEtat {
  if (ctx.enGrace) return { kind: "grace", heures: ctx.heuresGrace };
  if (ctx.joursRestants <= 0) return { kind: "expire" };
  if (ctx.essai) return { kind: "essai", jours: ctx.joursRestants };
  if (ctx.joursRestants <= 7) return { kind: "bientot", jours: ctx.joursRestants };
  return { kind: "actif" };
}

/** Le badge de l'état, et la phrase qui l'explique. */
export function libelleAbonnement(
  etat: AbonnementEtat,
  echeance: number,
  formatDate: (ts: number) => string,
): { badge: string; detail: string } {
  switch (etat.kind) {
    case "grace":
      return {
        badge: `Grâce · ${etat.heures} h`,
        detail:
          `Abonnement échu le ${formatDate(echeance)} — la caisse fonctionne encore, ` +
          `mais la synchronisation s'arrête à la fin de la grâce.`,
      };
    case "expire":
      return {
        badge: "Expiré",
        detail: `L'échéance du ${formatDate(echeance)} est passée. La caisse est bloquée : renouvelez pour repartir.`,
      };
    case "essai":
      return {
        badge: `Essai · ${etat.jours} j`,
        detail: `Votre période d'essai se termine le ${formatDate(echeance)}. Un abonnement la prolongera.`,
      };
    case "bientot":
      return {
        badge: `Expire dans ${etat.jours} j`,
        detail: `Abonnement actif jusqu'au ${formatDate(echeance)}.`,
      };
    default:
      return {
        badge: "Abonnement",
        detail: `Abonnement actif jusqu'au ${formatDate(echeance)}.`,
      };
  }
}
