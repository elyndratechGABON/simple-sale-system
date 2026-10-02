// Tests du TRANSPORT : la boucle outbox → relais → `applyRemoteOps`, avec un relais
// simulé (mock `fetch` du protocole `/api/v1/ops`). Le relais est une boîte muette :
// il stocke les ops par `shop_id` et les rend telles quelles — sa mémoire vit ici, dans
// la variable locale, comme elle vivrait côté orchestrateur dans une table.
import { describe, it, expect } from "vitest";
import {
  addProduct,
  addStock,
  createSale,
  getSaleItems,
  getDB,
  listProducts,
  listSales,
  resetDBForTests,
  setShopAccount,
} from "../db";
import { ensureIdentity, getIdentity, resetIdentityForTests, setIdentityRole } from "./identity";
import { announceDevice } from "./pairing";
import { signAll } from "./ops";
import { getDeviceKeys } from "./identity";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { listPairedDevices } from "./peers";
import { listPendingOps, markOpsSynced, purgeSyncedOps } from "./outbox";
import { exchangeOps, relayTransport, KEY_LAST_AUTO_SNAPSHOT } from "./transport";
import type { SyncOp } from "./types";
import { getPreferences, savePreferences } from "../settings";
import { ensureShopProfile } from "../db";

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

/**
 * L'annonce d'un pair, comme le relais la verrait : l'appareil local se présente, et le
 * pair d'abord contact est accepté parce que le GROUPE EST VIDE (confiance initiale).
 * C'est cette op qui installe la clé du pair dans le registre local — sans elle, ses
 * autres ops n'ont rien contre quoi se vérifier.
 */
async function announceOpFor(peerId: string): Promise<SyncOp> {
  const identity = await ensureIdentity();
  const [signed] = await signAll([
    {
      id: `annonce:${peerId}:1`,
      shop_id: identity.shopId,
      device_id: peerId,
      seq: 1,
      type: "device.announce",
      entity_id: peerId,
      payload: {
        device_id: peerId,
        // La chaîne SÉRIE, pas l'objet : c'est la forme que le pair annonce et que
        // `applyOp` réécrit en base. Un objet se sérialiserait en `[object Object]` et
        // deviendrait une clé invérifiable.
        public_key: getDeviceKeys().publicKey,
        employee_name: "Le proprietaire",
        role: "owner" as const,
      },
      created_at: Date.now(),
      status: "pending",
    },
  ]);
  return signed;
}

/** Relais de test : un Map `shop_id → ops[]`, servi par un mock `fetch`.
 *
 *  Il signe ce qu'on lui pousse, comme le ferait un émetteur honnête : le relais est
 *  aveugle et ne Sait pas signer, mais les ops qui le traversent portent leur `sig`
 *  d'origine. C'est ce qui permet aux tests d'injecter une op « d'un pair » sans
 *  manufacture manuelle de signatures. */
function makeRelay(peerSign?: () => Promise<SyncOp[]>) {
  const rows = new Map<string, SyncOp[]>();
  let fetches = 0;
  /** Op forgée « par un pair » : signée par la clé de l'appareil courant. */
  const asPeer = async (over: Partial<SyncOp>): Promise<SyncOp> => {
    const identity = await ensureIdentity();
    const base: SyncOp = {
      id: `pair:${identity.deviceId.slice(0, 8)}:1`,
      shop_id: identity.shopId,
      device_id: identity.deviceId,
      seq: 1,
      type: "catalogue.snapshot",
      entity_id: "catalog",
      payload: { products: [] },
      created_at: Date.now(),
      status: "pending",
      ...over,
    };
    const [signed] = await signAll([base]);
    return signed;
  };
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
    asPeer,
    peerSign,
  };
}

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
    // Publication continue : le propriétaire laisse aussi un instantané ABSOLU au relais.
    expect(relay.count(idA.shopId)).toBe(4);

    // Mobile B (base et identité neuves) tire et rejoue.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idB = getIdentity();
    expect(idB.deviceId).not.toBe(idA.deviceId);
    expect(idB.shopId).toBe(idA.shopId);

    const stateB = await exchangeOps(relay.client);
    // Les 4 ops du relais (annonce, product.created, sale.created, instantané) sont
    // étrangères à B et passent toutes par `applyRemoteOps` — l'annonce comprise, c'est
    // elle qui installe la clé d'A dont B a besoin pour vérifier les trois autres.
    expect(stateB.remote).toBe(4);
    expect(stateB.applied).toBe(4);
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
    expect(state.skipped).toBe(2); // product.created + l'instantané publié d'office
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

  it("émet un snapshot du catalogue quand un écran inconnu s'annonce", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // Le propriétaire a un catalogue vivant : création + réappro (stock courant 15).
    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
      photo: "data:image/webp;base64,test",
    });
    await addStock(product.id, 5);

    // Un écran inconnu s'annonce au groupe : son annonce, signée par sa propre clé.
    const announceOp = await announceOpFor("00000000-0000-0000-0000-0000000000aa");
    await relay.client.push(id.shopId, [announceOp]);

    await exchangeOps(relay.client);
    // L'instantané (et l'auto-publication de la même rotation) est AU RELAIS, poussé dès
    // ce cycle — plus seulement en attente dans l'outbox.
    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const snap = remote.find((o) => o.type === "catalogue.snapshot");
    expect(snap).toBeTruthy();
    // Le snapshot porte le stock ABSOLU courant (15) et la photo (webp ~256 px), pour
    // qu'un écran neuf voie tout de suite le catalogue tel qu'il est.
    const snapPayload = (snap?.payload ?? { products: [] }) as {
      products: Array<{ id: string; stock: number; photo?: unknown }>;
    };
    expect(snapPayload.products.find((p) => p.id === product.id)?.stock).toBe(15);
    expect(snapPayload.products.find((p) => p.id === product.id)?.photo).toBe(product.photo);
  });

  it("applique un snapshot du catalogue sur un écran neuf (stock absolu)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // L'op vient d'un PAIR : son `device_id` n'est pas le nôtre, sa signature doit être
    // valide, et sa clé doit être celle qu'on connaît — d'où l'annonce du pair d'abord.
    const snapOp = await relay.asPeer({
      id: "snap:1",
      device_id: "proprietaire",
      payload: {
        products: [
          {
            id: "p1",
            name: "Coca 1L",
            price: 600,
            cost: 300,
            category: "Boisson",
            stock: 15,
            updated_at: 0,
            sync_status: "local",
          },
        ],
      },
      status: "synced",
    });
    // Annonce ET snapshot dans le MÊME lot : c'est le cas réel — le relais rend tout le
    // groupe d'un coup — et la clé doit être résolue AVANT que le snapshot se vérifie.
    await relay.client.push(id.shopId, [await announceOpFor("proprietaire"), snapOp]);

    await exchangeOps(relay.client);
    const products = await listProducts();
    expect(products.find((p) => p.id === "p1")?.stock).toBe(15);
  });

  it("un snapshot n'écrase jamais un produit déjà présent (bootstrap + deltas seuls)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // Le pair a déjà son catalogue : un produit créé, deux unités déjà vendues.
    const product = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Pain",
          price: 100,
          cost: 40,
          category: "Boulangerie",
          quantity: 2,
        },
      ],
      cash_given: 200,
    });
    expect((await listProducts()).find((p) => p.id === product.id)?.stock).toBe(4);

    // Un instantané STALE (pris avant la vente) + un produit inconnu arrivent du principal.
    // L'instantané vient d'un pair : son annonce d'abord, sinon sa clé n'est pas
    // connue et le snapshot serait refusé.
    const snapOp = await relay.asPeer({
      id: "snap:2",
      device_id: "proprietaire",
      payload: {
        products: [
          {
            id: product.id,
            name: "Pain",
            price: 100,
            cost: 40,
            category: "Boulangerie",
            stock: 6,
            updated_at: 0,
            sync_status: "local",
          },
          {
            id: "p2",
            name: "Lait",
            price: 500,
            cost: 250,
            category: "Boisson",
            stock: 3,
            updated_at: 0,
            sync_status: "local",
          },
        ],
      },
      status: "synced",
    });
    await applyRemoteOpsSigned([await announceOpFor("proprietaire"), snapOp]);

    // Le produit connu GARDE son stock (4) : la vente du pair n'est pas « ressuscitée ».
    expect((await listProducts()).find((p) => p.id === product.id)?.stock).toBe(4);
    // Le produit inconnu, lui, est bootstrappé à l'absolu.
    expect((await listProducts()).find((p) => p.id === "p2")?.stock).toBe(3);
  });

  it("le snapshot porte le nom de la boutique au nouvel écran resté sur « Ma boutique »", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    const snapOp = await relay.asPeer({
      id: "snap:shop",
      device_id: "proprietaire",
      payload: {
        products: [],
        shop: { storeName: "Boutique Du Marché" },
      },
      status: "synced",
    });
    await relay.client.push(id.shopId, [await announceOpFor("proprietaire"), snapOp]);

    await exchangeOps(relay.client);
    // L'écran local est encore sur le fallback « Ma boutique » → il adopte le nom du relais.
    const profile = await ensureShopProfile("");
    expect(profile.storeName).toBe("Boutique Du Marché");
  });

  it("le propriétaire publie d'office un instantané FRIS, et seulement quand ça change", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // Premier cycle avec un catalogue vivant : l'instantané part sans qu'on le demande.
    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(2); // product.created + catalogue.snapshot
    expect((await listPendingOps(id.shopId)).length).toBe(0); // tout poussé et acquitté

    // Rien n'a changé au cycle suivant → le relais ne reçoit AUCUNE op de plus.
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(2);

    // Le stock bouge (réappro) → nouvelle publication, avec le stock ABSOLU courant (15).
    // (On fait vieillir la fenêtre anti-spam : en réel, une réappro survient bien plus de
    // 30 s après la première publication — plusieurs mouvements rapprochés sont fusionnés.)
    await getDB().settings.put({
      key: KEY_LAST_AUTO_SNAPSHOT,
      value: Date.now() - 60_000,
    });
    await addStock(product.id, 5);
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(4); // stock.adjusted + catalogue.snapshot republié

    // La dernière op au relais est l'instantané au stock courant — « Importer le stock du
    // propriétaire » n'a plus besoin du propriétaire : un simple tir ramène tout.
    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const last = remote.filter((o) => o.type === "catalogue.snapshot").at(-1)!;
    const payload = last.payload as { products: Array<{ id: string; stock: number }> };
    expect(payload.products.find((p) => p.id === product.id)?.stock).toBe(15);
  });

  it("une vente d'employé republie l'instantané via le cycle du propriétaire", async () => {
    // La caisse employé vend : ops product.created + sale.created posées au relais.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    const employeeId = getIdentity().deviceId;
    const relay = makeRelay();
    // L'employé s'annonce : sans cette clé chez le propriétaire, ses ops sont refusées.
    await announceDevice();

    const product = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    await createSale({ lines: [LINE(product.id)], cash_given: 1200 });
    await exchangeOps(relay.client); // l'employé pousse ses ops (un employé ne publie pas d'instantané)

    // Le propriétaire (base neuve, même groupe) tire et applique la vente.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const ownerId = getIdentity().deviceId;
    expect(ownerId).not.toBe(employeeId);

    await exchangeOps(relay.client);
    expect((await listSales()).length).toBe(1); // la vente de l'employé est appliquée

    // Son catalogue a changé de l'extérieur → il le republie au STOCK qui lui fait foi.
    const remote = await relay.client.pull(getIdentity().shopId, ownerId);
    const snapshots = remote.filter((o) => o.type === "catalogue.snapshot");
    // 2 : l'employé n'en publie pas, mais le propriétaire en a poussé un à sa rencontre
    // (nouvel écran) puis un autre après avoir appliqué la vente.
    expect(snapshots.length).toBe(2);
    const payload = snapshots[0].payload as { products: Array<{ id: string; stock: number }> };
    expect(payload.products.find((p) => p.id === product.id)?.stock).toBe(4); // 6 − 2 vendus
  });
});
