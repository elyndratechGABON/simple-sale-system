// Parseur de SMS de confirmation Mobile Money.
//
import { ParsedPaymentSms } from "@/lib/sms-payment";

/** Extrait le montant, l'ID transaction et le nom d'un SMS de confirmation. */
export function parsePaymentSms(sms: string): ParsedPaymentSms | null {
  if (typeof sms !== "string") return null;
  const text = sms.trim();
  if (!text) return null;
  const match =
    text.match(
      /^Recu\s+([\d.,]+)F\s+du\s+(\d+)\s*,\s*([^.]+)\.\s*Nouveau solde\s+[\d.,]+F\s*\.\s*TID\s*:\s*(.+)/i,
    ) ||
    text.match(
      /(?:Paiement|Payment)\s+(?:de\s+)?([\d.,]+)F\s+(?:recu|reçu)\s+(?:de\s+)?(\d+)\s*,\s*([^.]+)\.\s*(?:Ref|TID)\s*:\s*(.+)/i,
    );
  if (!match) return null;
  const [, rawAmount, phone, rawName, tid] = match;
  const amount = parseInt(rawAmount.replace(/[.\s]/g, ""), 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    amount,
    phone: phone.trim(),
    name: rawName
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    tid: tid.trim().replace(/[.\s]+$/, ""),
  };
}
