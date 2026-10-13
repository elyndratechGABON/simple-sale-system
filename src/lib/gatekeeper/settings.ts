/** Version de l'application remontée au serveur (colonne `app_version_used`). */
export const APP_VERSION = "pos-web-1";

/** Identité du projet/app à laquelle appartient cette caisse (`shops.app_origin`).
 *  Configurable par build (VITE_APP_ORIGIN) ; défaut 'pos' — le projet historique. */
export const APP_ORIGIN = (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() || "pos";

export const SETTING_LOCKED = "gatekeeper_suspended";
export const SETTING_LOCK_REASON = "gatekeeper_lock_reason";
export const SETTING_APPLIED = "gatekeeper_applied_command_ids";
export const SETTING_MESSAGES = "gatekeeper_messages";
export const SETTING_QUOTA = "gatekeeper_account_quota";
export const SETTING_REQUEST = "gatekeeper_subscription_request";
export const SETTING_GRACE_ENDS_AT = "gatekeeper_grace_ends_at";
export const SETTING_DELETE_REQUEST = "gatekeeper_delete_request";
export const SETTING_DELETE_PENDING = "gatekeeper_delete_online_pending";
export const SETTING_KEYWORD_CLAIM = "gatekeeper_keyword_claim";
export const SETTING_KEYWORD_REVEALED = "gatekeeper_keyword_revealed";
