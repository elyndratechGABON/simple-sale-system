// Déverrouillage OFFLINE-FIRST depuis une preuve de paiement locale.
//
// Le principe (le cœur du « sans serveur ») : quand l'orchestrateur est éteint — c'est
// la norme, il tourne sur le PC du marchand, pas dans le cloud — la caisse doit quand
// même pouvoir être débloquée dès que le client a payé. Cette caisse reçoit (via le SMS
// de confirmation de l'opérateur, collé par le marchand ou lu en natif Android) la preuve
// du paiement. On la valide puis :
//   1. persiste un « reçu » local (TID, montant, palier) — traçabilité + idempotence ;
//   2. lève le verrou de suspension localement (`unlockLocal`) ;
//   3. prolonge l'échéance locale de la durée du palier.
//
// Le prochain handshake — au retour en ligne → l'orchestrateur devient la source de
// vérité : si le compte y est réellement à jour, la suspension ne reviendra pas.
//
// QUI est « le marchand » dans le SMS ? Le format opérateur (« Recu 1000F du 074337844,
// Helene ») nomme le PAYEUR = le CLIENT. Le numéro du marchand (celui qui touche l'argent)
// n'apparaît PAS dans le corps du message : il est implicite — l'argent est arrivé sur le
// téléphone qui A reçu ce SMS. Le marchand valide donc visuellement le montant + le nom du
// client à l'écran ; le code garantit la structure du SMS et le montant/palier.
//
// Ce module est PUR hors réseau : aucune variable d'environnement, aucun fetch.
import { getShopProfile, getSetting, setSetting, setShopExpiry } from "@/lib/db";
import { unlockLocal } from "@/lib/gatekeeper";
import { matchTier, parsePaymentSms, type ParsedPaymentSms } from "@/lib/sms-payment";

export const SETTING_OFFLINE_RECEIPTS = "offline_payment_receipts";

export interface OfflineReceipt {
  tid: string;
  amount: number;
  planName: string;
  planDevices: number;
  customerName: string;
  customerPhone: string;
  unlockedAt: number;
}

/** Reçus de paiement déverrouillés localement, le plus récent en premier. */
export async function listOfflineReceipts(): Promise<OfflineReceipt[]> {
  const all = (await getSetting<OfflineReceipt[] | undefined>(SETTING_OFFLINE_RECEIPTS)) ?? [];
  return [...all].sort((a, b) => b.unlockedAt - a.unlockedAt);
}

/** Un déverrouillage pour ce TID a-t-il déjà eu lieu ? (idempotence) */
export async function hasReceipt(tid: string): Promise<boolean> {
  return (await listOfflineReceipts()).some((r) => r.tid === tid);
}

/**
 * Débloque la caisse depuis le texte (brut) d'un SMS de confirmation opérateur.
 * Sans réseau, sans serveur.
 *
 * Critères (côté machine) :
 *   - le SMS est une preuve de paiement reçue (`parsePaymentSms`) ;
 *   - le montant tombe sur un palier d'abonnement (`matchTier`) ;
 *   - le TID n'a pas déjà servi (idempotence).
 * Le marchand tranche le reste (montant + nom du client affichés) via l'UI.
 *
 * @returns ok:true + le reçu persisté, ou ok:false avec une raison actionnable.
 */
export async function unlockFromPaymentSms(
  smsText: string,
): Promise<{ ok: boolean; reason?: string; receipt?: OfflineReceipt }> {
  const parsed = parsePaymentSms(smsText);
  if (!parsed) return { ok: false, reason: "not_a_payment_sms" };

  if (!(await hasReceipt(parsed.tid))) {
    const tier = matchTier(parsed.amount);
    if (!tier) return { ok: false, reason: "no_matching_tier" };

    const now = Date.now();
    const daysToAdd = intDays(tier.period);
    const profile = await getShopProfile();
    const currentExpiry = profile?.expiryDate ?? now;
    const nextExpiry = Math.max(currentExpiry, now) + daysToAdd * 86_400_000;

    const receipt: OfflineReceipt = {
      tid: parsed.tid,
      amount: parsed.amount,
      planName: tier.name,
      planDevices: tier.devices,
      customerName: parsed.name,
      customerPhone: parsed.phone,
      unlockedAt: now,
    };

    const all = await listOfflineReceipts();
    await setSetting(SETTING_OFFLINE_RECEIPTS, [receipt, ...all].slice(0, 20));
    await unlockLocal();
    await setShopExpiry(nextExpiry);
    return { ok: true, receipt };
  }

  const existing = (await listOfflineReceipts()).find((r) => r.tid === parsed.tid);
  return { ok: true, receipt: existing };
}

/** « 30 jours » → 30 (défaut si introuvable). */
function intDays(period: string): number {
  const m = /(\d+)/.exec(period);
  return m ? parseInt(m[1], 10) : 30;
}

export type { ParsedPaymentSms };
