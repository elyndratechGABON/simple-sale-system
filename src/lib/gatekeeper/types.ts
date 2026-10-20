/** Places du compte marchand, telles que le serveur les voit au dernier handshake. */
export interface AccountQuota {
  maxDevices: number;
  deviceCount: number;
}

/**
 * Dernière demande d'abonnement du compte, telle que le serveur la voit au dernier
 * handshake : « pending » tant que l'admin n'a pas tranché, puis decided_at est posé.
 * Alimente l'indicateur « Demande en attente de validation » des Paramètres.
 */
export interface SubscriptionRequestStatus {
  status: "pending" | "approved" | "rejected";
  plan_price?: number;
  plan_devices?: number;
  reference?: string;
  created_at: number;
  decided_at?: number | null;
}

export type CommandType = "suspend" | "renew" | "broadcast_message" | "delete_account_request";

/** Pourquoi la caisse est bloquée : abonnement suspendu, quota d'appareils dépassé,
 *  mot clé de récupération rejeté, ou appareil déjà enregistré ailleurs. */
export type LockReason = "suspended" | "device_limit" | "keyword_invalid" | "device_conflict";

export interface AdminCommand {
  id: string;
  action_type: CommandType;
  payload: {
    new_end_date?: number;
    days?: number;
    max_devices?: number;
    message_text?: string;
    /** Cible d'une suppression de compte : device_id de la caisse concernée. */
    device_id?: string;
    /** Décision du propriétaire pour une `delete_account_request` : `approved` purge
     *  l'appareil (au consentement), `rejected` se contente d'afficher le refus. */
    status?: "approved" | "rejected";
    /** Motif libre du propriétaire (approbation comme refus). */
    message?: string;
  };
  expires_at: number;
  created_at: number;
}

/**
 * Demande de suppression de compte, envoyée par l'orchestrateur (tableau de bord) après
 * décision du propriétaire sur une demande soumise par l'employé. Contract du payload
 * `device_id` : le `device_id` que l'orchestrateur voit (celui de la fiche locale, envoyé
 * au handshake). La commande n'est honorée QUE sur l'appareil qui porte ce device_id —
 * jamais sur les autres caisses du groupe. `status` distingue l'approbation (purge locale
 * au CONSENTEMENT de l'employé) du refus (simple affichage, rien n'est détruit) ; une
 * commande émise par un orchestrateur ancien sans `status` vaut approbation.
 */
export interface DeleteAccountRequest {
  command_id: string;
  device_id: string;
  status: "approved" | "rejected";
  message?: string;
  requested_at: number;
}

export interface HandshakeResult {
  ok: boolean;
  sync_allowed: boolean;
  status: "active" | "suspended" | "expired" | "unknown";
  reason?:
    | "no-profile"
    | "network"
    | "error"
    | "account_password"
    | "device_limit"
    | "keyword_invalid"
    | "device_conflict";
}

export interface KeywordClaim {
  storeName: string;
  ownerName: string;
  keyword: string;
  submittedAt: number;
}

export interface KeywordJoinInput {
  storeName: string;
  ownerName: string;
  keyword: string;
}

export interface KeywordJoinResult {
  status: "verified" | "blocked" | "pending";
}
