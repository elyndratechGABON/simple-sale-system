// La démission d'un écran employé : il quitte le groupe LUI-MÊME via une op signée
// `device.leave` (payload `org_device_id` = lui-même). Chez le propriétaire, la fiche du
// registre est EFFACÉE — jamais reconstruite par le tampon `last_seen` d'`orchestrate`
// (sinon, une fiche sans rôle réapparaîtrait, lue « Propriétaire »).
//
// Le lot capturé est l'outbox brute signée (annonce + départ), PAS `captureSigned` :
// celui-ci ré-émettrait une annonce APRÈS le départ (l'appareil qui repart de zéro se
// ré-annonce), ce qui recréerait la fiche et masquerait l'effet du départ.
import { describe, it, expect, vi } from "vitest";
import {
  getDB,
  addEmployeeHistory,
  getShopProfile,
  listProducts,
  resetDBForTests,
  setShopAccount,
} from "../db";
import { ensureIdentity, getDeviceKeys, resetIdentityForTests } from "./identity";
import { setCachedIdentity, setCachedKeys } from "./identity/state";
import { signAll } from "./ops";
import { listPendingOps } from "./outbox";
import {
  announceDevice,
  departFromGroup,
  emitLeaveOp,
  generatePairingCode,
  leaveShop,
} from "./pairing";
import { flushPendingRelease, releaseSeat } from "@/lib/gatekeeper/seat";
import { listPairedDevices } from "./peers";
import { PAIRING_KEYS } from "./types";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ACCOUNT, freshDevice } from "./sync-engine-helpers";

describe("démission — device.leave", () => {
  it("efface la fiche du partant chez le propriétaire ; le catalogue n'en bouge pas", async () => {
    // Écran propriétaire : son identité est mise de côté pour être reconstituée à
    // l'identique plus bas (même deviceId, mêmes clés) — cf. recharge.test.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idO = await ensureIdentity();
    const keysO = getDeviceKeys();
    const token = await generatePairingCode();

    // Écran employé B : il rejoint le groupe avec ce code, puis émet son départ.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    void idB;
    await announceDevice(token);
    await emitLeaveOp();
    const bOps = await signAll(await listPendingOps(idB.shopId));
    expect(bOps.map((o) => o.type)).toEqual(["device.announce", "device.leave"]);
    // Le départ porte l'identifiant de l'écran CHEZ LE SERVEUR : c'est lui qui permet
    // de rendre la place (le quota orchestrateur compte les écrans du compte).
    const leaveOp0 = bOps.find((o) => o.type === "device.leave");
    expect((leaveOp0!.payload as { server_device_id?: string }).server_device_id).toBe(
      (await getShopProfile())?.deviceId,
    );

    // Retour chez le propriétaire : identité restaurée à l'identique, et le code de
    // paire est reposé tel quel — l'annonce de B est comparée à ce même jeton.
    await resetDBForTests();
    resetIdentityForTests();
    setCachedIdentity(idO);
    setCachedKeys(keysO);
    await getDB().settings.bulkPut([
      { key: PAIRING_KEYS.code, value: token },
      { key: PAIRING_KEYS.codeExpiresAt, value: Date.now() + 600_000 },
    ]);
    const { applied } = await applyRemoteOpsSigned(bOps);
    expect(applied).toBe(2);

    // L'annonce de B a bien épinglé la clé et passé B `paired` ; puis la démission,
    // appliquée APRÈS l'annonce (tri déterministe), a EFFACÉ la fiche :
    const leaveOp = bOps.find((o) => o.type === "device.leave");
    const registry = await listPairedDevices(idO.shopId);
    expect(leaveOp).toBeDefined();
    expect(registry.find((d) => d.id === leaveOp!.device_id)).toBeUndefined();
    // Le départ ne touche AUCUNE donnée métier.
    expect(await listProducts()).toHaveLength(0);
  });

  it("restitue le stock au propriétaire puis ferme le carnet d'expérience", async () => {
    // Écran propriétaire : son catalogue local (les quantités qu'il compte, hors
    // services) et un token de paire pour l'annonce du partant.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idO = await ensureIdentity();
    const keysO = getDeviceKeys();
    const token = await generatePairingCode();

    // Écran employé B : trois produits — un à rendre, un épuisé, un service (rien
    // à rendre physiquement). Son carnet d'expérience est ouvert pour ce shop.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    await addEmployeeHistory({
      employeeId: "emp-1",
      deviceId: idB.deviceId,
      shopId: idB.shopId,
      storeName: "B Boutique",
      cluster: "service",
    });
    const db = getDB();
    await db.products.bulkPut([
      {
        id: "p_render",
        name: "Bouteille",
        type: "product",
        stock: 3,
        price: 500,
        cost: 200,
        category: "Autre",
        updated_at: 1,
        sync_status: "local",
      },
      {
        id: "p_empty",
        name: "Épuisé",
        type: "product",
        stock: 0,
        price: 500,
        cost: 200,
        category: "Autre",
        updated_at: 1,
        sync_status: "local",
      },
      {
        id: "p_service",
        name: "Tresse",
        type: "service",
        stock: 9,
        price: 500,
        cost: 0,
        category: "Service",
        updated_at: 1,
        sync_status: "local",
      },
    ] as Parameters<typeof db.products.bulkPut>[0]);
    // C'est CET écran fiduciaire que le propriétaire est visé par les poussières
    // du stock : la fiche au rôle `owner` fait foi (pas l'annonce, pas le scan).
    // Son `id` est le DEVICE RÉEL du propriétaire (pas une fiche fantôme) — c'est
    // lui que le dispatch compare à `target_device_id`.
    await db.paired_devices.put({
      id: idO.deviceId,
      shop_id: idB.shopId,
      role: "owner",
      status: "paired",
      updated_at: Date.now(),
    } as Parameters<typeof db.paired_devices.put>[0]);

    await announceDevice(token);
    await leaveShop();
    const bOps = await signAll(await listPendingOps(idB.shopId));
    expect(bOps.map((o) => o.type)).toEqual(["device.announce", "stock.adjusted", "device.leave"]);
    const stockOp = bOps.find((o) => o.type === "stock.adjusted");
    expect(stockOp).toBeDefined();
    expect(stockOp!.entity_id).toBe("p_render");
    expect(
      stockOp!.payload as { product_id: string; delta: number; target_device_id: string },
    ).toEqual({
      product_id: "p_render",
      delta: 3,
      target_device_id: idO.deviceId,
    });
    // Le carnet survit à la purge et a été fermé — une durée compte pour ce shop.
    const carnet = await db.employee_history.where("employeeId").equals("emp-1").toArray();
    expect(carnet).toHaveLength(1);
    expect(carnet[0].endedAt).toBeDefined();
    expect(carnet[0].durationDays).toBeGreaterThanOrEqual(1);
    expect(carnet[0].shopId).toBe(idB.shopId);

    // Retour chez le propriétaire : identité restaurée, token reposé, et son
    // catalogue AVANT application (le delta viendra s'ajouter dessus).
    await resetDBForTests();
    resetIdentityForTests();
    setCachedIdentity(idO);
    setCachedKeys(keysO);
    await getDB().settings.bulkPut([
      { key: PAIRING_KEYS.code, value: token },
      { key: PAIRING_KEYS.codeExpiresAt, value: Date.now() + 600_000 },
    ]);
    const odb = getDB();
    await odb.products.bulkPut([
      {
        id: "p_render",
        name: "Bouteille",
        type: "product",
        stock: 4,
        price: 500,
        cost: 200,
        category: "Autre",
        updated_at: 1,
        sync_status: "local",
      },
      {
        id: "p_service",
        name: "Tresse",
        type: "service",
        stock: 9,
        price: 500,
        cost: 0,
        category: "Service",
        updated_at: 1,
        sync_status: "local",
      },
    ] as Parameters<typeof odb.products.bulkPut>[0]);
    const { applied } = await applyRemoteOpsSigned(bOps);
    expect(applied).toBe(3);

    // Le stock est rendu au BON écran (le propriétaire) : 4 + 3 = 7. Le service
    // (pas un bien physique) et le produit épuisé (0 en main) n'ont rien rendu.
    const rendered = await odb.products.get("p_render");
    expect(rendered?.stock).toBe(7);
    expect((await odb.products.get("p_service"))?.stock).toBe(9);
    // La fiche du partant est effacée chez le propriétaire (op device.leave présente).
    const leaveOp2 = bOps.find((o) => o.type === "device.leave");
    expect(leaveOp2).toBeDefined();
    expect(
      (await listPairedDevices(idO.shopId)).find((d) => d.id === leaveOp2!.device_id),
    ).toBeUndefined();
  });

  it("un départ rend la PLACE à l'orchestrateur (le quota compte les écrans)", async () => {
    // Le geste qui manquait à la suppression de boutique : l'écran disparaissait
    // chez lui mais CONTINUAIT de compter une place côté orchestrateur — le commerce
    // ne pouvait plus recrouver d'employé (« nombre limite d'appareils atteint »).
    const appels: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubEnv("VITE_ORCHESTRATOR_URL", "https://orchestrateur.test");
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      appels.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    // L'empreinte de l'appareil est lisible : elle est ce qui rattache le téléphone
    // à une boutique. La libération doit l'embarquer. (Node n'a pas de localStorage :
    // on en bricole un minimal.)
    const store = new Map<string, string>();
    (window as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
    store.set("pos_device_fingerprint", "empreinte-de-test");
    await departFromGroup();

    const appel = appels.find((a) => a.url.endsWith("/api/v1/devices/release"));
    expect(appel).toBeDefined();
    // L'identifiant de l'écran CHEZ LE SERVEUR : c'est lui que le serveur décompte.
    expect(appel!.body.device_id).toBe((await getShopProfile())?.deviceId);
    // L'EMPREINTE part avec : sans elle, le téléphone reste rattaché à son ancienne
    // boutique et se voit refuser toute nouvelle inscription.
    expect(appel!.body.fingerprint).toBe("empreinte-de-test");

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("une suppression hors ligne laisse la libération EN ATTENTE", async () => {
    // Le réseau coupé ne doit pas perdre la libération : la demande est mise en
    // attente (localStorage — la purge de la base ne peut pas l'emporter) et rejouée
    // au cycle suivant.
    vi.stubEnv("VITE_ORCHESTRATOR_URL", "https://orchestrateur.test");
    vi.stubGlobal("fetch", async () => {
      throw new Error("réseau coupé");
    });

    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const res = await releaseSeat("ecran-qui-part");
    expect(res.ok).toBe(false);
    // La demande est en attente, et elle porte ce qu'il faut pour la rejouer.
    const pending = JSON.parse(
      (window as unknown as { localStorage: Storage }).localStorage.getItem(
        "caisse_pos_pending_device_release",
      ) ?? "null",
    );
    expect(pending?.device_id).toBe("ecran-qui-part");

    // Le réseau revient : le rejeu part et la demande est effacée.
    const appels: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      appels.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const flushed = await flushPendingRelease();
    expect(flushed).toBe(true);
    expect(appels[0]?.url).toContain("/api/v1/devices/release");
    expect(appels[0]?.body.device_id).toBe("ecran-qui-part");
    expect(
      (window as unknown as { localStorage: Storage }).localStorage.getItem(
        "caisse_pos_pending_device_release",
      ),
    ).toBeNull();

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
