// La règle qui décide de ce que le commerçant lit dans « Paramètres → Compte ».
//
// Les cas à verrouiller :
//  - la GRÂCE passe avant l'essai (un compte échu mais en grâce n'est pas un essai) ;
//  - passé la grâce, c'est fini : le service est coupé ;
//  - un compte qui n'a jamais payé est un ESSAI, quel que soit le temps restant ;
//  - un abonnement qui expire sous 7 jours est signalé (bannière).
import { describe, it, expect } from "vitest";
import { etatAbonnement, libelleAbonnement } from "./subscription-state";

const date = (ts: number) => new Date(ts).toLocaleDateString("fr-FR");

describe("état d'abonnement", () => {
  it("un compte en grâce est en grâce, même s'il n'a jamais payé", () => {
    const etat = etatAbonnement({
      joursRestants: 0,
      enGrace: true,
      heuresGrace: 41,
      essai: true,
    });
    expect(etat.kind).toBe("grace");
    expect(libelleAbonnement(etat, Date.now(), date).badge).toBe("Grâce · 41 h");
  });

  it("passé la grâce, le service est coupé", () => {
    const etat = etatAbonnement({
      joursRestants: 0,
      enGrace: false,
      heuresGrace: 0,
      essai: false,
    });
    expect(etat.kind).toBe("expire");
    expect(libelleAbonnement(etat, Date.now(), date).badge).toBe("Expiré");
  });

  it("un compte qui n'a jamais payé est un essai, avec le temps restant", () => {
    const etat = etatAbonnement({
      joursRestants: 12,
      enGrace: false,
      heuresGrace: 0,
      essai: true,
    });
    expect(etat.kind).toBe("essai");
    expect(libelleAbonnement(etat, Date.now(), date).badge).toBe("Essai · 12 j");
  });

  it("un abonnement qui expire sous 7 jours est signalé", () => {
    const etat = etatAbonnement({
      joursRestants: 3,
      enGrace: false,
      heuresGrace: 0,
      essai: false,
    });
    expect(etat.kind).toBe("bientot");
    expect(libelleAbonnement(etat, Date.now(), date).badge).toBe("Expire dans 3 j");
  });

  it("un abonnement confortable n'affiche qu'un badge neutre", () => {
    const etat = etatAbonnement({
      joursRestants: 20,
      enGrace: false,
      heuresGrace: 0,
      essai: false,
    });
    expect(etat.kind).toBe("actif");
    expect(libelleAbonnement(etat, Date.now(), date).badge).toBe("Abonnement");
  });
});
