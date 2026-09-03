// Tests du parseur de SMS de confirmation Mobile Money + appariement palier.
// Fonctions pures, recalculables à la main — mêmes grammaires que l'orchestrateur.
import { describe, it, expect } from "vitest";
import { parsePaymentSms, matchTier, normalizePhone, isPaymentForMerchant } from "./sms-payment";

describe("parsePaymentSms", () => {
  it("parse un SMS Airtel Money", () => {
    const p = parsePaymentSms(
      "Recu 10000F du 074337844,Helene. Nouveau solde 1148.6F. TID: PP260818.1345.D05428.",
    );
    expect(p).toEqual({
      amount: 10000,
      phone: "074337844",
      name: "Helene",
      tid: "PP260818.1345.D05428",
    });
  });

  it("parse un SMS Moov (format alternatif)", () => {
    const p = parsePaymentSms("Paiement de 25000F recu de 076123456,Jean. Ref: ABC123.");
    expect(p).toEqual({ amount: 25000, phone: "076123456", name: "Jean", tid: "ABC123" });
  });

  it("supporte les montants pointés ou espacés", () => {
    const p = parsePaymentSms("Recu 1.000F du 074337844,Lucie. Nouveau solde 99F. TID: T1.");
    expect(p?.amount).toBe(1000);
  });

  it("renvoie null pour un SMS non-paiement", () => {
    expect(parsePaymentSms("Bienvenue sur votre espace client.")).toBeNull();
    expect(parsePaymentSms("")).toBeNull();
    expect(parsePaymentSms("Recu 0F du 074337844,A. Nouveau solde 1F. TID: T.")).toBeNull();
  });
});

describe("matchTier", () => {
  it("retrouve le bon palier 3/5/9 par montant", () => {
    expect(matchTier(10000)?.devices).toBe(3);
    expect(matchTier(25000)?.devices).toBe(5);
    expect(matchTier(50000)?.devices).toBe(9);
    // Montant supérieur → palier le plus haut ; montant insuffisant → null.
    expect(matchTier(75000)?.devices).toBe(9);
    expect(matchTier(5000)).toBeNull();
  });
});

describe("normalizePhone / isPaymentForMerchant", () => {
  it("normalise indicatif et séparateurs", () => {
    expect(normalizePhone("+241076505254")).toBe("076505254");
    expect(normalizePhone("07-65 05 25.4")).toBe("076505254");
    expect(normalizePhone(null)).toBe("");
  });

  it("reconnaît un paiement vers le numéro marchand", () => {
    const parsed = parsePaymentSms("Paiement de 25000F recu de 076505254,Client. Ref: R1.");
    expect(parsed && isPaymentForMerchant(parsed, "+241076505254")).toBe(true);
  });

  it("refuse un paiement vers un autre numéro", () => {
    const parsed = parsePaymentSms("Paiement de 25000F recu de 076999999,Autre. Ref: R2.");
    expect(parsed && isPaymentForMerchant(parsed, "076505254")).toBe(false);
  });
});
