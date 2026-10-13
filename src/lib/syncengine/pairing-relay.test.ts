// Rencontre par relais, un sens à la fois : le principal se présente → le nouvel écran
// le découvre pairé ; une approbation (pending → paired) se propage à un troisième
// écran. Puis le flux QR : scan → compte posé → annonce avec le code → pairé d'office,
// et un code périmé laisse l'écran en attente.
import { describe, it, expect } from "vitest";
import { getDB, setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity, getIdentity, setIdentityEmployeeName, setIdentityRole } from "./identity";
import { announceDevice, approveDevice, enterPairingCode, generatePairingCode } from "./pairing";
import { listPairedDevices } from "./peers";
import { listPendingOps } from "./outbox";
import { exchangeOps } from "./transport";
import { DeviceAnnouncePayload, PAIRING_KEYS } from "./types";
import { ACCOUNT, announceOp, freshDevice, makeRelay } from "./pairing-helpers";

describe("rencontre par relais", () => {
  it("le principal se présente → le nouvel écran le découvre pairé (owner)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("owner");
    await setIdentityEmployeeName("Chef");
    const relay = makeRelay();
    const idO = getIdentity();
    await announceDevice(); // présence sans code : le rôle de confiance suffit
    await exchangeOps(relay.client);
    expect(relay.count(idO.shopId)).toBe(1);

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    await setIdentityEmployeeName("Vendeuse");
    const state = await exchangeOps(relay.client);
    expect(state.applied).toBe(1);
    const peer = (await listPairedDevices(getIdentity().shopId)).find((p) => p.id === idO.deviceId);
    expect(peer?.status).toBe("paired");
    expect(peer?.role).toBe("owner");
    expect(peer?.device_name).toBe("Chef");
  });

  it("une approbation (pending → paired) se propage à un troisième écran", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("owner");
    const shopId = getIdentity().shopId;
    const relay = makeRelay();

    // Le principal s'annonce d'abord (comme à l'onboarding) : c'est cette op qui donne
    // sa clé au troisième écran, sans quoi l'approbation qu'il pousse ensuite ne serait
    // vérifiable par personne.
    await announceDevice();
    await exchangeOps(relay.client);

    // Puis il applique une annonce restée PENDING (mauvais code) et l'approuve à la main.
    await applyRemoteOpsSigned([
      await announceOp(shopId, "device-e9", 1, { employee_name: "Nouveau", pair_code: "ZZZZZZ" }),
    ]);
    await approveDevice("device-e9", "employee");
    await exchangeOps(relay.client); // pousse l'approbation vers le relais

    // Troisième écran : il TIRE sans s'annoncer. Un appareil `pending` ne synchronise
    // pas (garde d'`exchangeOps`) — s'annoncer ici le laisserait bloqué, ce qui est le
    // comportement voulu : tant qu'il n'a ni le code ni une approbation, il ne reçoit
    // rien. Ce qu'il vérifie ici, c'est la propagation de l'approbation elle-même.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const state = await exchangeOps(relay.client);
    expect(state.applied).toBeGreaterThan(0);
    const peers = await listPairedDevices(getIdentity().shopId);
    const target = peers.find((p) => p.id === "device-e9");
    expect(target?.status).toBe("paired");
    expect(target?.role).toBe("employee");
    // Aucune fiche de soi-même dans le registre.
    expect(peers.some((p) => p.id === getIdentity().deviceId)).toBe(false);
  });
});

describe("QR + code de confirmation temporaire", () => {
  it("scan → compte posé → annonce avec le code → le principal le pair d'office", async () => {
    // Principal : compte, code actif, apprendra l'écran par le relais.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const relay = makeRelay();
    const shopId = getIdentity().shopId;

    // Nouvelle caisse : annonce avec le code lu dans le QR (même appel que le wizard),
    // puis pousse son op vers le relais.
    await freshDevice();
    await setShopAccount(ACCOUNT); // le compte → même groupe s_
    await ensureIdentity();
    expect(getIdentity().shopId).toBe(shopId);
    const res = await enterPairingCode(code);
    expect(res).toBe("sent");
    const pending = (await listPendingOps(shopId)).filter((o) => o.type === "device.announce");
    expect(pending).toHaveLength(1);
    expect((pending[0].payload as DeviceAnnouncePayload).pair_code).toBe(code);
    await exchangeOps(relay.client);

    // Le principal tire : reconnaît le code → `paired` d'office.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    expect(getIdentity().shopId).toBe(shopId);
    const state = await exchangeOps(relay.client);
    expect(state.applied).toBeGreaterThan(0);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id !== getIdentity().deviceId);
    expect(peer?.status).toBe("paired");
    expect(peer?.role).toBe("owner");
  });

  it("un code périmé dans le QR laisse l'écran en attente d'approbation (pas pairé)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const shopId = getIdentity().shopId;
    await getDB().settings.put({ key: PAIRING_KEYS.codeExpiresAt, value: Date.now() - 1000 });

    // Nouvelle caisse : lit le QR (code expiré), pose le compte, s'annonce en employé
    // (un rôle employé n'est pas « de confiance » : seule la preuve du code le pair),
    // puis pousse son op vers le relais.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    const scannerId = getIdentity().deviceId;
    await enterPairingCode(code);
    const relay = makeRelay();
    await exchangeOps(relay.client);

    // Le principal tire : le code est périmé → l'écran reste en attente, pas pairé.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const state = await exchangeOps(relay.client);
    expect(state.applied).toBeGreaterThan(0);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === scannerId);
    expect(peer).toBeDefined();
    expect(peer?.status).toBe("pending");
    expect(peer?.paired_at).toBeUndefined();
  });
});
