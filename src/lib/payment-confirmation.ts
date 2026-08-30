// Canal de NOTIFICATION « paiement confirmé » — jamais la preuve du paiement.
//
// La source de vérité reste le serveur : SMS reçu → vérification → PAIEMENT VALIDÉ
// (la `subscription_request` du handshake passe à « approved »). CE N'EST QU'ALORS
// qu'on ouvre WhatsApp avec un message prérempli sur le numéro marchand (la régie) ;
// rien ne part automatiquement — le commerçant appuie sur Envoyer.
//
// Un paiement douteux (rejeté) ne déclenche JAMAIS de message « paiement effectué ».
// Le drapeau one-shot (`payment_confirmation_pending`) est posé à l'envoi de la
// demande et effacé à la notification — chaque renouvellement a ainsi son message.
import { getPreferences } from "@/lib/settings";

export interface PaymentConfirmation {
  planName: string;
  planPrice: number;
  planDevices: number;
  planPeriod: string;
  reference: string;
  requestedAt: number;
}

/** Numéro marchand qui reçoit l'argent (la régie). C'est LUI le destinataire du
 *  message « paiement confirmé ». Source unique — PaymentModal l'importe aussi. */
export const PAYMENT_WHATSAPP_NUMBER = "241076505254";

const KEY = "payment_confirmation_pending";

export function setPaymentConfirmationPending(conf: PaymentConfirmation): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(conf));
  } catch {
    // Quota plein / stockage refusé : le message WhatsApp sera perdu, la validation
    // elle (la preuve) reste intacte côté serveur. Sans gravité.
  }
}

export function getPaymentConfirmationPending(): PaymentConfirmation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PaymentConfirmation>;
    if (
      typeof parsed.planName !== "string" ||
      typeof parsed.planPrice !== "number" ||
      typeof parsed.reference !== "string" ||
      typeof parsed.requestedAt !== "number"
    ) {
      return null;
    }
    return {
      planName: parsed.planName,
      planPrice: parsed.planPrice,
      planDevices: parsed.planDevices ?? 0,
      planPeriod: parsed.planPeriod ?? "30 jours",
      reference: parsed.reference,
      requestedAt: parsed.requestedAt,
    };
  } catch {
    return null;
  }
}

export function clearPaymentConfirmationPending(): void {
  window.localStorage.removeItem(KEY);
}

/** Message prérempli conforme au gabarit « Paiement effectué / confirmé ». Le
 *  « client » est le commerçant qui paie : numéro de l'enseigne si renseigné. */
export function buildPaymentConfirmedWhatsappUrl(
  conf: PaymentConfirmation,
  decidedAt?: number,
): string {
  const prefs = getPreferences();
  const clientPhone = prefs.phone.trim();
  const date = new Date(decidedAt ?? conf.requestedAt).toLocaleDateString("fr-FR");
  const msg = [
    "💰 Paiement effectué !",
    "",
    `👤 Boutique : ${prefs.workspaceName}`,
    ...(clientPhone ? [`📱 Client : ${clientPhone}`] : []),
    `💳 Abonnement : ${conf.planName} (${conf.planDevices} appareils, ${conf.planPeriod})`,
    `💵 Montant : ${conf.planPrice.toLocaleString("fr-FR")} FCFA`,
    `🧾 Référence : ${conf.reference}`,
    `📅 Date : ${date}`,
    "",
    "✅ Paiement confirmé — abonnement renouvelé.",
  ].join("\n");
  return `https://wa.me/${PAYMENT_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
