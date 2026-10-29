// Sync asymétrique (owner -> employee) : garde-fous sur le BOOTSTRAP de confiance.
//
// Le propriétaire s'était annoncé AVANT l'employé : quand le pair rejoint, son groupe
// est déjà peuplé, l'annonce du patron n'est plus « prouvée » chez lui, sa clé
// publique n'a jamais été épinglée — et toutes les ops du patron (product.created en
// tête) sont refusées. La contre-annonce du principal AVEC le code du nouveau venu
// répare ce bootstrap ; ces tests verrouillent les deux briques qui la rendent
// possible.
import { describe, it, expect } from "vitest";
import { setShopAccount, getDB, resetDBForTests } from "../db";
import { announceDevice, generatePairingCode } from "./pairing";
import { ensureIdentity, resetIdentityForTests, getIdentity } from "./identity";
import { knownPairCode } from "./pairing/code";
import { listPendingOps } from "./outbox";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };

describe("preuve de code chez l'EMPLOYÉ (annonce avec code)", () => {
  it("l'employé retient le code ressaisi comme preuve d'invitation", async () => {
    resetDBForTests();
    resetIdentityForTests();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();

    // Le code n'est pas le sien (il vient du QR du patron) : connu seulement après
    // l'annonce qui le porte.
    await announceDevice("ABCDEF");

    expect(await knownPairCode("ABCDEF")).toBe(true);
    expect(await knownPairCode("ZZZZZZ")).toBe(false);
  });
});

describe("contre-annonce du PROPRIÉTAIRE", () => {
  it("sans force, une seconde annonce ne repart pas (one-shot)…", async () => {
    resetDBForTests();
    resetIdentityForTests();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();

    await announceDevice();
    const first = await listPendingOps(getIdentity().shopId);
    await announceDevice();

    const second = await listPendingOps(getIdentity().shopId);
    expect(second.length).toBe(first.length);
  });

  it("…mais avec force et le code du NOUVEAU venu, elle repart en portant le code", async () => {
    resetDBForTests();
    resetIdentityForTests();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();

    await announceDevice();
    const first = await listPendingOps(getIdentity().shopId);

    // Le nouveau venu a annoncé SON pair_code : le principal re-annonce avec lui.
    await announceDevice("GHIJKL", { force: true });

    const second = await listPendingOps(getIdentity().shopId);
    expect(second.length).toBe(first.length + 1);
    const latest = second.find((o) => o.id !== first[0]?.id);
    expect(latest?.type).toBe("device.announce");
    expect((latest?.payload as { pair_code?: string }).pair_code).toBe("GHIJKL");
  });
});

// Le relais garde les ops : la contre-annonce arrive au pair en même temps que
// product.created. Garde minimale : la preuve du pair lit la LISTE des codes récents
// (fenêtre 12 h, `PAIRING_KEYS.recentCodes`), jamais le seul code actif qui expire
// en 10 minutes.
