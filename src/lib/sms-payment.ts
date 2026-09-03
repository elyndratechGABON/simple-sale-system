// Parseur de SMS de confirmation Mobile Money — module PUR, hors réseau.
//
// Miroir du parser de l'orchestrateur (`sms-parser.mjs`) mais embarqué dans la caisse :
// c'est lui qui permet le déverrouillage OFFLINE — le client colle (ou, sur Android en
// lecture native, l'app lit) le SMS reçu de l'opérateur ; on en extrait montant, numéro,
// nom et TID, on valide que le numéro est bien celui du marchand et que le montant tombe
// sur un palier, puis on déverrouille localement sans attendre le serveur.
//
// Formats supportés (mobile money gabonais) :
//   Airtel : "Recu 1000F du 074337844,Helene. Nouveau solde 1148.6F. TID: PP260818.1345.D05428."
//   Moov   : "Paiement de 10000F recu de 076123456,Jean. Ref: ABC123."
import { PLANS, type PlanInfo } from "@/lib/pricing";

export interface ParsedPaymentSms {
  /** Montant en FCFA (entier). */
  amount: number;
  /** Numéro du payeur (sans indicatif). */
  phone: string;
  /** Nom du payeur (title-case). */
  name: string;
  /** Identifiant unique de transaction (TID / Ref). */
  tid: string;
}

// Airtel Money : "Recu 1000F du 074337844,Helene. Nouveau solde … TID: …".
const AIRTEL_RE =
  /^Recu\s+([\d.,]+)F\s+du\s+(\d+)\s*,\s*([^.]+)\.\s*Nouveau solde\s+[\d.,]+F\s*\.\s*TID\s*:\s*(.+)/i;

// Format alternatif Moov / autre opérateur : "Paiement de 10000F recu de 076123456,Jean. Ref: ABC123."
const ALT_RE =
  /(?:Paiement|Payment)\s+(?:de\s+)?([\d.,]+)F\s+(?:recu|reçu)\s+(?:de\s+)?(\d+)\s*,\s*([^.]+)\.\s*(?:Ref|TID)\s*:\s*(.+)/i;

function normalizeName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "10.000" / "10000" / "1 000" → 10000. */
function normalizeAmount(raw: string): number {
  return parseInt(raw.replace(/[.\s]/g, ""), 10);
}

/** Parse un SMS de confirmation Mobile Money, ou renvoie null si ce n'en est pas un. */
export function parsePaymentSms(sms: string): ParsedPaymentSms | null {
  if (typeof sms !== "string") return null;
  const text = sms.trim();
  if (!text) return null;
  const match = text.match(AIRTEL_RE) || text.match(ALT_RE);
  if (!match) return null;
  const [, rawAmount, phone, rawName, tid] = match;
  const amount = normalizeAmount(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    amount,
    phone: phone.trim(),
    name: normalizeName(rawName),
    tid: tid.trim().replace(/[.\s]+$/, ""),
  };
}

/**
 * Trouve le palier d'abonnement correspondant à un montant payé.
 * « L'écran du propriétaire compte toujours » : les paliers pricing.ts valent déjà 3/5/9.
 */
export function matchTier(amount: number): PlanInfo | null {
  const sorted = [...PLANS].sort((a, b) => b.price - a.price);
  return sorted.find((p) => amount >= p.price) ?? null;
}

/**
 * Normalise un numéro marchand saisi : retire espaces/tirets/point, retire un indicatif
 * +241/+242/+237 éventuel, mais CONSERVE le « 0 » de tête — les numéros gabonais de
 * téléphonie mobile commencent par 0 (076…). Deux numéros au même format se comparent.
 */
export function normalizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw.replace(/[\s.\-()]/g, "").replace(/^\+(241|242|237)?/, "");
}

/**
 * Vrai si le message porte la preuve que LE MARCHAND (le numéro qui reçoit l'argent) a
 * été payé : on compare le numéro de l'enseigne enregistré à celui retrouvé dans le SMS.
 * Le SMS « du 076XXXXXX » peut oublier l'indicatif (074…) ou le « 0 » de tête — on
 * normalise des deux côtés avant comparaison.
 */
export function isPaymentForMerchant(parsed: ParsedPaymentSms, merchantPhone: string): boolean {
  const merchant = normalizePhone(merchantPhone);
  if (!merchant) return false;
  return normalizePhone(parsed.phone) === merchant;
}
