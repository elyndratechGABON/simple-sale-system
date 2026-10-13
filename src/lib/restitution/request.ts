import { FORMAT_VERSION, SCHEMA_APP, TYPE_RESTITUTION, type RestitutionRequest } from "./types";
import { tryParseObj } from "./utils";

/**
 * Fabrique le payload JSON du QR de restitution d'un propriétaire.
 * @param shop    Enseigne / nom de compte du propriétaire.
 * @param device  deviceId du propriétaire (l'employé lui rendra ses agrégats).
 */
export function buildRestitutionRequest(shop: string, device: string): string {
  const request: RestitutionRequest = {
    v: FORMAT_VERSION,
    app: SCHEMA_APP,
    type: TYPE_RESTITUTION,
    shop: shop.trim() || "Ma boutique",
    device,
    ts: Date.now(),
  };
  return JSON.stringify(request);
}

/** Lit un QR de restitution. Renvoie `null` si méconnaissable ou invalide. */
export function parseRestitutionRequest(text: string): RestitutionRequest | null {
  const data = tryParseObj(text);
  if (!data) return null;
  if (
    data.app !== SCHEMA_APP ||
    data.type !== TYPE_RESTITUTION ||
    typeof data.device !== "string" ||
    data.device.trim().length === 0 ||
    typeof data.shop !== "string"
  ) {
    return null;
  }
  return {
    v: FORMAT_VERSION,
    app: SCHEMA_APP,
    type: TYPE_RESTITUTION,
    shop: data.shop,
    device: data.device.trim(),
    ts: typeof data.ts === "number" ? data.ts : Date.now(),
  };
}
