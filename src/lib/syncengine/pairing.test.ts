// Tests de l'APPAIRAGE entre appareils : le code de paire coopératif sur le canal d'ops.
//
// Le moteur virtuellement multiappareil : un SEUL appareil est « courant » à la fois
// (singleton de la base + cache d'identité modulo, comme dans un vrai navigateur — on
// ne garde pas deux caisses ouvertes dans le même process). Les tests couvrent donc :
//  - les DÉCISIONS d'application (`applyRemoteOps`) : code juste/mauvais/expiré/sans code,
//    par synthèse d'ops de pairs — le chemin exact par lequel le principal consomme ;
//  - la CONSOMMATION par relais d'un direction unique à la fois (pattern des tests de
//    transport) : le principal se présente → le nouvel écran le découvre pairé ;
//  - la PROPAGATION d'une approbation (pending → paired) à un troisième écran.
import { describe, it, expect } from "vitest";
import { ensureShopProfile, getDB, resetDBForTests, setShopAccount, setShopKeyword } from "../db";
import { applyRemoteOps } from "./apply";
import {
  ensureIdentity,
  getIdentity,
  resetDeviceIdentity,
  resetIdentityForTests,
  setIdentityEmployeeName,
  setIdentityRole,
} from "./identity";
import { listPairedDevices } from "./peers";
import { listPendingOps } from "./outbox";
import { exchangeOps, relayTransport } from "./transport";
import {
  announceDevice,
  approveDevice,
  clearPairingCode,
  enterPairingCode,
  generatePairingCode,
  getActivePairingCode,
  isOwnerIdentity,
  pairCodeExpiry,
} from "./pairing";
import type { DeviceAnnouncePayload, SyncOp } from "./types";
import { PAIRING_KEYS } from "./types";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };

async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

/** Relais de test identique à celui du transport : un Map `shop_id → ops[]`. */
function makeRelay() {
  const rows = new Map<string, SyncOp[]>();
  let fetches = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    fetches++;
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("/api/v1/ops")) {
      if (method === "POST") {
        const body = JSON.parse(String(init?.body)) as { shop_id: string; ops: SyncOp[] };
        const existing = new Set((rows.get(body.shop_id) ?? []).map((o) => o.id));
        const fresh = body.ops.filter((o) => !existing.has(o.id));
        rows.set(body.shop_id, [...(rows.get(body.shop_id) ?? []), ...fresh]);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      const shopId = new URL(url, "http://relay.test").searchParams.get("shop_id") ?? "";
      return new Response(JSON.stringify({ ops: rows.get(shopId) ?? [] }), { status: 200 });
    }
    return new Response(null, { status: 404 });
  };
  return {
    client: relayTransport("https://relay.test", fetchImpl),
    fetches: () => fetches,
    count: (shopId: string) => (rows.get(shopId) ?? []).length,
  };
}

/** Une op `device.announce` SYNTHÉTIQUE, telle qu'un pair étranger l'aurait émise. */
function announceOp(
  shopId: string,
  deviceId: string,
  seq: number,
  over: Partial<DeviceAnnouncePayload> = {},
): SyncOp {
  return {
    id: `pair:${seq}`,
    shop_id: shopId,
    device_id: deviceId,
    seq,
    type: "device.announce",
    entity_id: deviceId,
    payload: {
      device_id: deviceId,
      public_key: `key-${seq}`,
      employee_name: "Écran",
      role: "employee",
      ...over,
    },
    created_at: 1000 + seq,
    status: "synced",
  };
}

const PAIR_SHOP = (deviceId: string) =>
  `s_${deviceId.toLowerCase().replace(/-/g, "").slice(0, 12)}`;

describe("code de paire", () => {
  it("génère un code à durée de vie courte, lisible tant qu'il est valide", async () => {
    await freshDevice();
    const code = await generatePairingCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await getActivePairingCode()).toBe(code);
    expect(await pairCodeExpiry()).toBeGreaterThan(Date.now());

    await clearPairingCode();
    expect(await getActivePairingCode()).toBeNull();
    expect(await pairCodeExpiry()).toBeNull();
  });

  it("un appareil sans compte n'a rien à annoncer", async () => {
    await freshDevice();
    await ensureIdentity();
    const before = (await listPendingOps(getIdentity().shopId)).length;
    await announceDevice("ABCDEF");
    expect((await listPendingOps(getIdentity().shopId)).length).toBe(before);
  });

  it("une saisie valide se présente au groupe une seule fois", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();
    const shopId = getIdentity().shopId;
    await enterPairingCode("A2B2C3");
    await enterPairingCode("D4E5F6"); // re-saisie : drapeau posé, pas de seconde annonce
    const announces = (await listPendingOps(shopId)).filter((o) => o.type === "device.announce");
    expect(announces).toHaveLength(1);
    await exchangeOps(relay.client);
    expect(relay.count(shopId)).toBe(1);
  });
});

describe("décision d'application du code (côté principal)", () => {
  it("un code juste appaire l'écran d'office (clé publique, nom, rôle, date)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    const shopId = getIdentity().shopId;

    await applyRemoteOps([
      announceOp(shopId, "device-juste", 1, { employee_name: "Vendeuse", pair_code: code }),
    ]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-juste");
    expect(peer?.status).toBe("paired");
    expect(peer?.role).toBe("employee");
    expect(peer?.device_name).toBe("Vendeuse");
    expect(peer?.public_key).toBe("key-1");
    expect(peer?.paired_at).toBeDefined();
  });

  it("un mauvais code laisse l'écran en attente (pas de date de pair), l'approbation le pair", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await generatePairingCode(); // le code du principal est « autre » que celui du pair
    const shopId = getIdentity().shopId;

    await applyRemoteOps([
      announceOp(shopId, "device-intrus", 1, { employee_name: "Intrus", pair_code: "ZZZZZZ" }),
    ]);
    let peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-intrus");
    expect(peer?.status).toBe("pending");
    expect(peer?.paired_at).toBeUndefined();

    // Approbation manuelle → la décision est écrite en local et une op part aux autres.
    await approveDevice("device-intrus", "employee");
    peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-intrus");
    expect(peer?.status).toBe("paired");
    expect((await listPendingOps(shopId)).some((o) => o.type === "device.approve")).toBe(true);
  });

  it("un code expiré est refusé comme un mauvais code", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const code = await generatePairingCode();
    await getDB().settings.put({ key: PAIRING_KEYS.codeExpiresAt, value: Date.now() - 1000 });
    const shopId = getIdentity().shopId;

    await applyRemoteOps([announceOp(shopId, "device-tardif", 1, { pair_code: code })]);
    const peer = (await listPairedDevices(shopId)).find((p) => p.id === "device-tardif");
    expect(peer?.status).toBe("pending");
  });

  it("une annonce sans code n'est acceptée que pour un rôle de confiance (owner)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;

    await applyRemoteOps([
      announceOp(shopId, "device-boss", 1, { role: "owner", employee_name: "Chef" }),
      announceOp(shopId, "device-inconnu", 2, { pair_code: undefined }),
    ]);
    const peers = await listPairedDevices(shopId);
    expect(peers.find((p) => p.id === "device-boss")?.status).toBe("paired");
    expect(peers.find((p) => p.id === "device-inconnu")?.status).toBe("pending");
  });
});

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

    // Le principal applique une annonce restée PENDING (mauvais code), puis approuve.
    await applyRemoteOps([
      announceOp(shopId, "device-e9", 1, { employee_name: "Nouveau", pair_code: "ZZZZZZ" }),
    ]);
    await approveDevice("device-e9", "employee");
    await exchangeOps(relay.client); // pousse l'approbation vers le relais

    // Troisième écran (employé) tire : il voit le pair PENDING puis la décision le PAIR.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
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

describe("groupes", () => {
  it("deux écrans rattachés par le même mot clé partagent le même shopId", async () => {
    await freshDevice();
    await ensureShopProfile("Boutique");
    await setShopKeyword("ABCD-EFGH");
    const idA = await ensureIdentity();
    expect(idA.shopId.startsWith("s_")).toBe(true);
    const idB = await resetDeviceIdentity(); // le profil (donc le mot clé) persiste
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idB.shopId).toBe(idA.shopId);

    // Un AUTRE compte par mot clé → un autre groupe, jamais de croisement.
    await setShopKeyword("ZZZZ-AAAA");
    const idC = await resetDeviceIdentity();
    expect(idC.shopId).not.toBe(idA.shopId);
  });

  it("l'identité du nouveau venu porte le rôle à annoncer", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    expect(isOwnerIdentity()).toBe(true); // défaut : le premier écran est le principal
    await setIdentityRole("employee");
    expect(isOwnerIdentity()).toBe(false);
  });
});
