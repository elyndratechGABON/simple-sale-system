// Tests du TRANSPORT : la boucle outbox → relais → `applyRemoteOps`, avec un relais
// simulé (mock `fetch` du protocole `/api/v1/ops`). Le relais est une boîte muette :
// il stocke les ops par `shop_id` et les rend telles quelles — sa mémoire vit ici, dans
// la variable locale, comme elle vivrait côté orchestrateur dans une table.
import { describe, it, expect } from "vitest";
import {
  addProduct,
  createSale,
  getSaleItems,
  getDB,
  listProducts,
  listSales,
  resetDBForTests,
  setShopAccount,
} from "../db";
import { ensureIdentity, getIdentity, resetIdentityForTests } from "./identity";
import { listPairedDevices } from "./peers";
import { listPendingOps, markOpsSynced, purgeSyncedOps } from "./outbox";
import { exchangeOps, relayTransport } from "./transport";
import type { SyncOp } from "./types";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };
const LINE = (productId: string) => ({
  product_id: productId,
  name: "Coca 1L",
  price: 600,
  cost: 300,
  category: "Boisson" as const,
  quantity: 2,
});

async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

/** Relais de test : un Map `shop_id → ops[]`, servi par un mock `fetch`. */
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
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const shopId = new URL(url, "http://relay.test").searchParams.get("shop_id") ?? "";
      return new Response(JSON.stringify({ ops: rows.get(shopId) ?? [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(null, { status: 404 });
  };
  return {
    client: relayTransport("https://relay.test", fetchImpl),
    fetches: () => fetches,
    count: (shopId: string) => (rows.get(shopId) ?? []).length,
  };
}

describe("transport P2P via relais", () => {
  it("fait aller les ops d'un mobile à l'autre via le relais", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idA = getIdentity();
    const relay = makeRelay();

    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await createSale({ lines: [LINE(product.id)], cash_given: 1200 });

    // Mobile A pousse son outbox → relais, acquitte localement.
    const stateA = await exchangeOps(relay.client);
    expect(stateA.pushed).toBe(2); // product.created + sale.created
    expect(stateA.applied).toBe(0);
    expect((await listPendingOps(idA.shopId)).length).toBe(0);
    expect(relay.count(idA.shopId)).toBe(2);

    // Mobile B (base et identité neuves) tire et rejoue.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idB = getIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idB.shopId).toBe(idA.shopId);

    const stateB = await exchangeOps(relay.client);
    expect(stateB.remote).toBe(2);
    expect(stateB.applied).toBe(2);
    expect(stateB.pushed).toBe(0);

    // B a convergé : stock, ventes, lignes.
    const productsB = await listProducts();
    expect(productsB.find((p) => p.id === product.id)?.stock).toBe(8);
    const salesB = await listSales();
    expect(salesB.length).toBe(1);
    expect(await getSaleItems(salesB[0].id)).toHaveLength(1);

    // B a rencontré A : registre des pairs rempli.
    const peersB = await listPairedDevices(idB.shopId);
    expect(peersB.map((p) => p.id)).toContain(idA.deviceId);
  });

  it("ne jette pas quand le relais est inaccessible (push en échec)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();

    const product = await addProduct({
      name: "Café",
      price: 200,
      cost: 60,
      category: "Chaud",
      stock: 5,
    });
    const deadTransport = relayTransport("https://down.relay", async () => {
      throw new Error("network down");
    });

    const state = await exchangeOps(deadTransport);
    expect(state.pushed).toBe(0);
    expect(state.applied).toBe(0);
    // L'outbox est conservée pour le prochain tick.
    expect((await listPendingOps(id.shopId)).some((o) => o.entity_id === product.id)).toBe(true);
  });

  it("ne rejoue pas ses propres ops au pull", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    await addProduct({ name: "Jus", price: 300, cost: 100, category: "Boisson", stock: 4 });
    await exchangeOps(relay.client); // push + acquittement

    // Second cycle : outbox vide, mais le relais renvoie nos propres ops → à sauter.
    const state = await exchangeOps(relay.client);
    expect(state.pushed).toBe(0);
    expect(state.applied).toBe(0);
    expect(state.skipped).toBe(1); // la seule op du groupe est la nôtre
  });

  it("groupe isolé sans compte → aucun appel au relais", async () => {
    await freshDevice();
    await ensureIdentity();
    const relay = makeRelay();
    const state = await exchangeOps(relay.client);
    expect(state).toEqual({ pushed: 0, applied: 0, skipped: 0, remote: 0 });
    expect(relay.fetches()).toBe(0);
  });

  it("le relais est idempotent sur un re-push et la purge TTL vide l'outbox acquittée", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    await addProduct({ name: "Pain", price: 100, cost: 40, category: "Boulangerie", stock: 6 });
    const pending = await listPendingOps(id.shopId);
    // Push deux fois les MÊMES ops : un seul lot chez le relais (idempotence par id).
    await relay.client.push(id.shopId, pending);
    await relay.client.push(id.shopId, pending);
    expect(relay.count(id.shopId)).toBe(1);

    // Acquittement puis purge : l'outbox locale se vide.
    await markOpsSynced(pending.map((o) => o.id));
    await new Promise((r) => setTimeout(r, 10)); // laisser l'op vieillir d'un TTL
    await purgeSyncedOps(1);
    expect(await getDB().sync_ops.count()).toBe(0);
  });
});
