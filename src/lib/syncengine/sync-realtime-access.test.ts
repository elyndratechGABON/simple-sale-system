// Garde d'accès par rôle du moteur temps réel : ce que voit un employé (les écrans de
// vente) contre ce que voit le propriétaire (tout), et l'enregistrement des pairs.
import { describe, it, expect } from "vitest";
import { addProduct, setShopAccount } from "../db";
import { canAccessRoute } from "../access";
import { ensureIdentity, getIdentity, setIdentityRole } from "./identity";
import { listPairedDevices } from "./peers";
import { exchangeOps } from "./transport";
import { announceDevice } from "./pairing";
import { ACCOUNT, freshDevice, makeRelay } from "./sync-realtime-helpers";

// ─── Scénario 5 : garde d'accès par rôle ──────────────────────────────────────
describe("sync temps réel : garde d'accès par rôle", () => {
  it("un employé peut accéder à /dashboard, /pos, /stocks et /settings", () => {
    expect(canAccessRoute("/dashboard", "employee")).toBe(true);
    expect(canAccessRoute("/pos", "employee")).toBe(true);
    expect(canAccessRoute("/stocks", "employee")).toBe(true);
    // /settings est ouvert à l'employé (onglet Compte : démission, expérience) —
    // la page elle-même masque le reste.
    expect(canAccessRoute("/settings", "employee")).toBe(true);
    expect(canAccessRoute("/reports", "employee")).toBe(false);
    expect(canAccessRoute("/history", "employee")).toBe(false);
  });

  it("un propriétaire peut accéder à tout", () => {
    expect(canAccessRoute("/pos", "owner")).toBe(true);
    expect(canAccessRoute("/stocks", "owner")).toBe(true);
    expect(canAccessRoute("/reports", "owner")).toBe(true);
    expect(canAccessRoute("/history", "owner")).toBe(true);
    expect(canAccessRoute("/settings", "owner")).toBe(true);
    expect(canAccessRoute("/dashboard", "owner")).toBe(true);
  });

  it("un appareil pairé est bien identifié dans le registre", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idOwner = getIdentity();
    const relay = makeRelay();

    // L'appareil se présente : cette op installe sa clé dans le registre des pairs.
    // Sans elle, aucun pair ne peut vérifier ses ops.
    await announceDevice();

    // Le propriétaire crée un produit (génère une op qui peuple paired_devices via applyRemoteOps)
    await addProduct({
      name: "Coca",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await exchangeOps(relay.client);

    // L'employé reçoit l'op → l'appareil du propriétaire est dans le registre
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await exchangeOps(relay.client);

    const peers = await listPairedDevices(getIdentity().shopId);
    expect(peers.map((p) => p.id)).toContain(idOwner.deviceId);
  });
});
