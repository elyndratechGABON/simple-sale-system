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
import { exchangeOps, relayTransport } from "./transport";
import { saveShareDecision } from "./sharing";
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

/** Un pair employé, déjà appairé dans le registre local : c'est la fiche sur laquelle le
 *  propriétaire règle son partage de stock. */
async function pairPeer(peerId: string): Promise<void> {
  const identity = await ensureIdentity();
  await getDB().paired_devices.put({
    id: peerId,
    shop_id: identity.shopId,
    device_name: peerId === "fatu" ? "Fatou" : "Jean-Yves",
    role: "employee",
    status: "paired",
    updated_at: Date.now(),
  });
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

  it("n'envoie à un employé que le sous-catalogue choisi pour lui", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    const coca = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
      photo: "data:image/webp;base64,test",
    });
    const pain = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    await addStock(coca.id, 5);

    // Deux employés, deux choix : Fatou aura tout, Jean-Yves seulement le Pain.
    await pairPeer("fatu");
    await pairPeer("yves");
    await saveShareDecision("fatu", "all", []);
    await saveShareDecision("yves", "selection", [pain.id]);

    await exchangeOps(relay.client);
    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const snaps = remote.filter((o) => o.type === "catalogue.snapshot");
    const partages = snaps.map((o) => o.payload as {
      target_device_id?: string;
      products: Array<{ id: string; stock: number; photo?: unknown }>;
    });

    const fatou = partages.find((p) => p.target_device_id === "fatu");
    expect(fatou?.products.map((p) => p.id).sort()).toEqual([coca.id, pain.id].sort());
    // Le stock ABSOLU courant (10 + 5 de réappro) et la photo voyagent bien.
    expect(fatou?.products.find((p) => p.id === coca.id)?.stock).toBe(15);
    expect(fatou?.products.find((p) => p.id === coca.id)?.photo).toBe(coca.photo);

    const yves = partages.find((p) => p.target_device_id === "yves");
    expect(yves?.products.map((p) => p.id)).toEqual([pain.id]);
  });

  it("un instantané destiné à un autre écran est ignoré, sans toucher au catalogue", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    const snapOp = await relay.asPeer({
      id: "snap:autre",
      device_id: "proprietaire",
      payload: {
        target_device_id: "employe-distant",
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
    await applyRemoteOpsSigned([await announceOpFor("proprietaire"), snapOp]);
    // Le partage est une décision du PROPRIÉTAIRE : un instantané qui ne me vise pas ne
    // crée rien chez moi. Sans ce filtre, tout le groupe recevait tout le catalogue.
    expect((await listProducts()).length).toBe(0);
  });

  it("un snapshot sans destinataire reste applicable (historique conservé)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    const snapOp = await relay.asPeer({
      id: "snap:sans-cible",
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
    await applyRemoteOpsSigned([await announceOpFor("proprietaire"), snapOp]);
    expect((await listProducts()).find((p) => p.id === "p1")?.stock).toBe(15);
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

  it("un instantané plus récent réaligne le stock d'un écran qui a déjà le produit", async () => {
    // Le « transfert de stock » du propriétaire vers l'employé n'est pas qu'un bootstrap :
    // une correction de comptage faite par le propriétaire NE part par aucune op
    // (`updateProduct` ne propage pas le stock, `applyRemoteOps` n'émet rien) — l'instantané
    // est alors le SEUL canal qui la porte. Sans réalignement, la caisse employé garde le
    // stock de son dernier import pour toujours.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    const drink = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 4,
    });
    const shirt = await addProduct({
      name: "T-shirt",
      price: 5000,
      cost: 2000,
      category: "Vetement",
      stock: 3,
      variants: [
        { id: "v1", name: "M", stock: 2 },
        { id: "v2", name: "L", stock: 1 },
      ],
    });

    const snapshot = (id: string, stock: number, variantStock: number, updatedAt: number) =>
      relay.asPeer({
        id,
        device_id: "proprietaire",
        payload: {
          products: [
            { ...drink, stock, updated_at: updatedAt },
            {
              ...shirt,
              stock,
              updated_at: updatedAt,
              variants: [
                { id: "v1", name: "M", stock: variantStock },
                { id: "v2", name: "L", stock: variantStock },
              ],
            },
          ],
        },
        status: "synced",
      });

    // Le propriétaire republie au stock qui lui fait foi — écrit APRÈS notre copie.
    await applyRemoteOpsSigned([
      await announceOpFor("proprietaire"),
      await snapshot("snap:frais", 15, 9, Date.now() + 60_000),
    ]);
    const after = await listProducts();
    expect(after.find((p) => p.id === drink.id)?.stock).toBe(15);
    expect(after.find((p) => p.id === shirt.id)?.stock).toBe(15);
    expect(after.find((p) => p.id === shirt.id)?.variants?.map((v) => v.stock)).toEqual([9, 9]);

    // Un instantané PÉRIMÉ (pris avant une vente déjà comptée ici) ne ressuscite rien.
    await applyRemoteOpsSigned([await snapshot("snap:perime", 4, 1, Date.now() - 60_000)]);
    const stale = await listProducts();
    expect(stale.find((p) => p.id === drink.id)?.stock).toBe(15);
    expect(stale.find((p) => p.id === shirt.id)?.variants?.map((v) => v.stock)).toEqual([9, 9]);
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

it("le propriétaire republie à chaque employé, et seulement quand SA part change", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // Un employé appairé : c'est pour LUI que le propriétaire publie.
    await pairPeer("fatu");

    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(2); // product.created + son instantané
    expect((await listPendingOps(id.shopId)).length).toBe(0); // tout poussé et acquitté

    // Rien n'a changé au cycle suivant → le relais ne reçoit AUCUNE op de plus.
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(2);

    // Le stock bouge (réappro) → republication au stock ABSOLU courant (15).
    // On fait vieillir la fenêtre anti-spam DE L'ÉCRAN : c'est elle qui décide, pas un
    // délai global (sinon la part d'un employé qui change serait bloquée par le stock
    // d'un autre).
    await getDB().paired_devices.update("fatu", {
      shared_published_at: Date.now() - 60_000,
    });
    await addStock(product.id, 5);
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(4); // stock.adjusted + instantané republié

    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const last = remote.filter((o) => o.type === "catalogue.snapshot").at(-1)!;
    const payload = last.payload as { products: Array<{ id: string; stock: number }> };
    expect(payload.products.find((p) => p.id === product.id)?.stock).toBe(15);
  });

  it("une sélection qui ne change pas n'est pas réémise, même si le stock du reste bouge", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();
    await pairPeer("yves");

    const partage = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    const prive = await addProduct({
      name: "Caisse register",
      price: 90000,
      cost: 90000,
      category: "Materiel",
      stock: 1,
    });
    await saveShareDecision("yves", "selection", [partage.id]);

    /** Les instantanés que le relais détient pour « yves », et leur contenu. */
    const partsPourYves = async () => {
      const remote = await relay.client.pull(id.shopId, id.deviceId);
      return remote
        .filter((o) => o.type === "catalogue.snapshot")
        .map((o) => o.payload as { target_device_id?: string; products: Array<{ id: string; stock: number }> })
        .filter((p) => p.target_device_id === "yves");
    };

    await exchangeOps(relay.client);
    expect(await partsPourYves()).toHaveLength(1);

    // Le produit NON partagé bouge : Jean-Yves n'a pas à le recevoir, donc AUCUN
    // instantané ne repart pour lui — même si la fenêtre du pair est ouverte.
    await getDB().paired_devices.update("yves", { shared_published_at: Date.now() - 60_000 });
    await addStock(prive.id, 5);
    await exchangeOps(relay.client);
    expect(await partsPourYves()).toHaveLength(1);

    // Son produit partagé bouge, lui → republication, et il ne reçoit QUE le sien.
    await getDB().paired_devices.update("yves", { shared_published_at: Date.now() - 60_000 });
    await addStock(partage.id, 3);
    await exchangeOps(relay.client);

    const parts = await partsPourYves();
    expect(parts).toHaveLength(2);
    expect(parts[1].products.map((p) => p.id)).toEqual([partage.id]);
    expect(parts[1].products[0].stock).toBe(9);
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

    // Le propriétaire (base neuve, même groupe) tire et applique la vente. L'employé est
    // appairé chez lui (son annonce le dit) : c'est à CE peer-là qu'il renverra son stock.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const ownerId = getIdentity().deviceId;
    expect(ownerId).not.toBe(employeeId);

    await exchangeOps(relay.client);
    expect((await listSales()).length).toBe(1); // la vente de l'employé est appliquée
    // L'annonce de l'employé l'a inscrit au registre → le propriétaire lui répond avec le
    // sous-catalogue de SA fiche (par défaut : tout, comme avant ce choix par employé).
    await pairPeer(employeeId);

    await exchangeOps(relay.client);
    const remote = await relay.client.pull(getIdentity().shopId, ownerId);
    const snapshots = remote.filter((o) => o.type === "catalogue.snapshot");
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const payload = snapshots.at(-1)!.payload as {
      target_device_id?: string;
      products: Array<{ id: string; stock: number }>;
    };
    expect(payload.target_device_id).toBe(employeeId);
    expect(payload.products.find((p) => p.id === product.id)?.stock).toBe(4); // 6 − 2 vendus
  });
});
