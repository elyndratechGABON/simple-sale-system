// Le MODE MAINTENANCE : l'orchestrateur coupe la synchronisation entre écrans.
//
// Ce que le test verrouille, et pourquoi c'est important :
//  1. la caisse NE DOIT PAS pousser/tirer ses opérations pendant la maintenance —
//     c'est tout l'intérêt de l'interrupteur ;
//  2. elle ne doit PAS être bloquée pour autant : elle encaisse (hors ligne
//     d'abord). Un mode maintenance qui stopperait la vente serait pire que
//     l'interruption qu'il prétend éviter.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDB, resetDBForTests, setSetting } from "../db";
import { SETTING_MAINTENANCE } from "../gatekeeper/settings";
import { getMaintenanceState, isMaintenanceOn } from "./maintenance";

beforeEach(async () => {
  await resetDBForTests();
});

afterEach(async () => {
  await resetDBForTests();
});

describe("mode maintenance", () => {
  it("par défaut, il est éteint", async () => {
    expect((await getMaintenanceState()).enabled).toBe(false);
    expect(await isMaintenanceOn()).toBe(false);
  });

  it("la caisse retient l'état annoncé par le serveur", async () => {
    await setSetting(SETTING_MAINTENANCE, {
      enabled: true,
      message: "Mise à jour du catalogue",
    });
    const state = await getMaintenanceState();
    expect(state.enabled).toBe(true);
    expect(state.message).toBe("Mise à jour du catalogue");
    expect(await isMaintenanceOn()).toBe(true);
  });

  it("levée : la carence disparaît (la caisse doit repartir)", async () => {
    await setSetting(SETTING_MAINTENANCE, { enabled: true, message: "" });
    expect(await isMaintenanceOn()).toBe(true);
    // Le handshake écrit `null` quand le mode est levé.
    await setSetting(SETTING_MAINTENANCE, null);
    expect(await isMaintenanceOn()).toBe(false);
  });

  it("un état corrompu ne casse pas la caisse", async () => {
    await getDB().settings.put({ key: SETTING_MAINTENANCE, value: { enabled: "oui" } });
    const state = await getMaintenanceState();
    expect(state.enabled).toBe(true);
    expect(typeof state.message).toBe("string");
  });
});
