/** Deux types de compte : le propriétaire et les employés. Le rôle `manager` a été
 *  supprimé — un ancien « gérant » se lit comme un employé. */
export type DeviceRole = "owner" | "employee";

export interface SyncIdentity {
  /** Identifiant d'appareil stable — unique par mobile. */
  deviceId: string;
  /** Groupe de partage : deux appareils du même shopId se synchronisent. */
  shopId: string;
  role: DeviceRole;
  employeeName: string;
  /** Numéro que l'employé déclare pour être joint par son patron. Volontairement hors du
   *  compte : c'est une identité de personne, pas une donnée d'abonnement. Vide = non
   *  déclaré, et l'interface le dit au lieu d'inventer une valeur. */
  employeePhone: string;
}

export interface DeviceKeys {
  /** Clé publique (JWK, série). Partagée via le pairing. */
  publicKey: string;
  /** Clé privée (JWK, série). NE DOIT JAMAIS quitter l'appareil. */
  privateKey: string;
}
