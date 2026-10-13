// Boucle outbox → relais → `applyRemoteOps` : aller-retour d'un mobile à l'autre,
// résilience quand le relais tombe, non-rejeu de ses propres ops au pull, absence
// d'appel pour un groupe sans compte, idempotence du re-push et purge TTL.
import { describe, it, expect } from "vitest";
import {
  addProduct,
  createSale,
  getDB,
  getSaleItems,
  listProducts,
  listSales,
  setShopAccount,
} from "../db";
import { ensureIdentity, getIdentity } from "./identity";
import { announceDevice } from "./pairing";
import { exchangeOps, relayTransport } from "./transport";
import { markOpsSynced, purgeSyncedOps, listPendingOps } from "./outbox";
import { listPairedDevices } from "./peers";
import { ACCOUNT, LINE, freshDevice, makeRelay } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("fait aller les ops d'un mobile à l'autre via le relais", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idA = getIdentity();
    const relay = makeRelay();

    // L'ANNONCE d'A d'abord : c'est elle qui donne à B la clé publique d'A, sans quoi B
    // n'a rien contre quoi vérifier les ops suivantes et les refuserait toutes.
    await announceDevice();
    await exchangeOps(relay.client);
    expect(relay.count(idA.shopId)).toBe(1);

    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await createSale({ lines: [LINE(product.id)], cash_given: 1200 });

    // Mobile A pousse le reste de son outbox → relais, acquitte localement.
    const stateA = await exchangeOps(relay.client);
    expect(stateA.pushed).toBe(2); // product.created + sale.created
    expect(stateA.applied).toBe(0);
    expect((await listPendingOps(idA.shopId)).length).toBe(0);
    // Aucun instantané pour l'instant : A n'a encore AUCUN employé appairé. Le partage est
    // désormais adressé (« ce catalogue est pour CET écran »), donc hors pair enregistré
    // il n'y a personne à qui publier — avant, tout le groupe recevait tout.
    expect(relay.count(idA.shopId)).toBe(3);

    // Mobile B (base et identité neuves) tire et rejoue.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idB = getIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idB.shopId).toBe(idA.shopId);

    const stateB = await exchangeOps(relay.client);
    // Les 3 ops du relais (annonce, product.created, sale.created) sont étrangères à B et
    // passent toutes par `applyRemoteOps` — l'annonce comprise, c'est elle qui installe la
    // clé d'A dont B a besoin pour vérifier les deux autres.
    expect(stateB.remote).toBe(3);
    expect(stateB.applied).toBe(3);
    expect(stateB.pushed).toBe(0);

    // B a convergé : stock, ventes, lignes.
    const productsB = await listProducts();
    expect(productsB.find((p) => p.id === product.id)?.stock).toBe(8);
    const salesB = await listSales();
    expect(salesB.length).toBe(1);
    expect(await getSaleItems(salesB[0].id)).toHaveLength(1);

    // B a rencontré A : registre des pairs rempli, clé comprise — c'est elle qui
    // permettra de vérifier les prochaines ops d'A.
    const peersB = await listPairedDevices(idB.shopId);
    const peerA = peersB.find((p) => p.id === idA.deviceId);
    expect(peerA).toBeDefined();
    expect(peerA?.public_key).toBeTruthy();
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
    // 1 : le produit. L'instantané ne sort plus tout seul — il n'a de destinataire que si un
    // employé appairé existe (cf. « le propriétaire republie à chaque employé »).
    expect(state.skipped).toBe(1);
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
