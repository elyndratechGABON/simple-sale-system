// La décision de verrouiller l'écran, d'après ce que dit le serveur.
//
// Ce qui est verrouillé, et ce qui ne l'est PAS :
//  - pendant la PÉRIODE DE GRÂCE (3 jours après l'échéance), le compte reste
//    « actif » : la caisse fonctionne, rien n'est bloqué ;
//  - passé le délai sans paiement validé, le statut « expiré » BLOQUE l'écran : c'est
//    la fin de la tolérance (les données locales restent intactes, le marchand
//    renouvelle pour repartir) ;
//  - « suspended » = décision d'Elyndra ; « device_limit » = une place manque.
import { describe, it, expect } from "vitest";
import { lockDecision } from "./handshake-support";

describe("verrouillage de l'écran (statut du compte)", () => {
  it("un compte actif n'est jamais bloqué", () => {
    expect(lockDecision({ status: "active" })).toEqual({ locked: false, reason: null });
  });

  it("la période de grâce ne bloque rien", () => {
    // Pendant la grâce, le serveur répond « active » (le compte reste actif) : la
    // caisse doit continuer à fonctionner.
    expect(lockDecision({ status: "active" }).locked).toBe(false);
  });

  it("la fin de la grâce coupe l'écran", () => {
    expect(lockDecision({ status: "expired" })).toEqual({ locked: true, reason: "expired" });
  });

  it("une suspension d'Elyndra bloque aussi", () => {
    expect(lockDecision({ status: "suspended" })).toEqual({ locked: true, reason: "suspended" });
  });

  it("le dépassement de quota a sa propre raison", () => {
    expect(lockDecision({ status: "active", over_limit: true })).toEqual({
      locked: true,
      reason: "device_limit",
    });
  });
});
