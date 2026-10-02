// Tests de synchronisation temps réel entre appareils d'une même boutique.
//
// Chaque scénario simule deux (ou trois) appareils via `freshDevice()` + `makeRelay()` :
// un appareil effectue une opération, pousse vers le relais, puis un autre appareil tire
// et vérifie la convergence. Le moteur est le même que transport.test.ts — les tests ici
// se concentrent sur les CAS MÉTIER de partage (produit, vente, stock) et les GARDIENS
// d'accès (rôle employé ne voit que /pos et /stocks).
import { describe, it, expect } from "vitest";
import {
  addProduct,
  removeStock,
  createSale,
  getSaleItems,
  getDB,
  listProducts,
  listSales,
  resetDBForTests,
  setShopAccount,
} from "../db";
import { canAccessRoute } from "../access";
import { ensureIdentity, getIdentity, resetIdentityForTests, setIdentityRole } from "./identity";
import { listPairedDevices } from "./peers";
import { exchangeOps, relayTransport } from "./transport";
import { announceDevice, approveDevice, generatePairingCode, getPairingToken } from "./pairing";
import type { SyncOp } from "./types";

const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };

async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

/**
 * Un appareil du groupe, appairé pour de vrai.
 *
 * Le propriétaire se présente sans code (premier contact : le groupe est vide, sa clé
 * s'installe d'office). L'employé, lui, présente LE CODE : c'est la seule preuve qu'un
 * appareil ne peut pas fabriquer, et donc la seule façon d'entrer comme autorité de
 * signature dans un groupe déjà peuplé. Un employé qui s'annoncerait sans code resterait
 * `pending` — comportement correct, mais ses ops seraient alors refusées partout.
 */
async function joinAs(role: "owner" | "employee", pairCode?: string): Promise<void> {
  await setShopAccount(ACCOUNT);
  await ensureIdentity();
  if (role === "employee") await setIdentityRole("employee");
  await announceDevice(pairCode);
  if (role === "owner") {
    // Le propriétaire affiche un code que l'employé saisira.
    await generatePairingCode();
  }
}

/**
 * Le propriétaire balaie le relais et APPROUVE à la main tout pair resté `pending`.
 *
 * C'est la seconde porte d'entrée d'une clé (cf. `applyOp`, `device.approve`) : un
 * employé qui s'est annoncé SANS code — donc non prouvé — entre quand même au registre
 * dès que le propriétaire tranche, et son announced `public_key` est alors épinglée.
 * Les autres écrans l'apprennent par l'op d'approbation, signée du principal.
 */
async function ownerApprovesPending(relay: ReturnType<typeof makeRelay>): Promise<void> {
  await joinAs("owner");
  await exchangeOps(relay.client);
  const pending = (await listPairedDevices(getIdentity().shopId)).filter(
    (d) => d.status === "pending" && d.public_key,
  );
  for (const peer of pending) await approveDevice(peer.id, "employee");
  await exchangeOps(relay.client);
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

// ─── Scénario 1 : produit créé par le propriétaire → l'employé le voit ────────
describe("sync temps réel : produit créé par le propriétaire", () => {
  it("le propriétaire crée un produit → l'employé le voit après sync", async () => {
    // Appareil A : propriétaire
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const idOwner = getIdentity();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await exchangeOps(relay.client);

    // Appareil B : employé, même compte, appairé avec le CODE du propriétaire.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    expect(getIdentity().shopId).toBe(idOwner.shopId);

    const state = await exchangeOps(relay.client);
    expect(state.applied).toBeGreaterThanOrEqual(1);

    const products = await listProducts();
    const found = products.find((p) => p.id === product.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Coca 1L");
    expect(found?.stock).toBe(10);
  });
});

// ─── Scénario 2 : vente créée par l'employé → le propriétaire la voit ────────
describe("sync temps réel : vente créée par l'employé", () => {
  it("l'employé encaisse → le propriétaire voit la vente et le stock baisse", async () => {
    // Propriétaire crée le produit et sync
    await freshDevice();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Café",
      price: 200,
      cost: 60,
      category: "Chaud",
      stock: 5,
    });
    await exchangeOps(relay.client);

    // Employé reçoit le produit (appairé avec le code du propriétaire).
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);

    const localProducts = await listProducts();
    expect(localProducts.find((p) => p.id === product.id)?.stock).toBe(5);

    // Employé encaisse une vente (2 cafés)
    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Café",
          price: 200,
          cost: 60,
          category: "Boisson",
          quantity: 2,
        },
      ],
      cash_given: 400,
    });

    // Le stock descend sur l'appareil employé
    const afterSale = await listProducts();
    expect(afterSale.find((p) => p.id === product.id)?.stock).toBe(3);

    // L'employé pousse
    await exchangeOps(relay.client);

    // Le propriétaire tire
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await exchangeOps(relay.client);

    // Le propriétaire voit la vente
    const ownerSales = await listSales();
    expect(ownerSales.length).toBe(1);
    const items = await getSaleItems(ownerSales[0].id);
    expect(items).toHaveLength(1);
    expect(items[0].product_id).toBe(product.id);

    // Le stock a bien baissé chez le propriétaire aussi
    const ownerProducts = await listProducts();
    expect(ownerProducts.find((p) => p.id === product.id)?.stock).toBe(3);
  });
});

// ─── Scénario 3 : ajustement de stock par l'employé → visible partout ──────────
describe("sync temps réel : ajustement de stock par l'employé", () => {
  it("un employé ajuste le stock → le propriétaire et l'employé voient le nouveau stock", async () => {
    // Propriétaire crée le produit
    await freshDevice();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 20,
    });
    await exchangeOps(relay.client);

    // Employé reçoit le produit, ajuste le stock
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);

    const before = await listProducts();
    expect(before.find((p) => p.id === product.id)?.stock).toBe(20);

    await removeStock(product.id, 5); // -5 pains

    const afterAdjust = await listProducts();
    expect(afterAdjust.find((p) => p.id === product.id)?.stock).toBe(15);

    await exchangeOps(relay.client);

    // Le propriétaire tire
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await exchangeOps(relay.client);

    const ownerProducts = await listProducts();
    expect(ownerProducts.find((p) => p.id === product.id)?.stock).toBe(15);
  });
});

// ─── Scénario 4 : deux appareils hors-lin → convergence au retour ─────────────
describe("sync temps réel : convergence après hors-ligne", () => {
  it("deux appareils modifient le même produit hors-ligne → les deux ventes convergent", async () => {
    // Setup : propriétaire crée le produit et le pousse
    await freshDevice();
    const relay = makeRelay();
    await joinAs("owner");
    const pairCode = await getPairingToken();

    const product = await addProduct({
      name: "Eau 1L",
      price: 300,
      cost: 150,
      category: "Boisson",
      stock: 100,
    });
    await exchangeOps(relay.client);

    // Appareil A : reçoit le produit, vend 10, pousse.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);
    const pA = (await listProducts()).find((p) => p.id === product.id);
    expect(pA?.stock).toBe(100);

    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Eau 1L",
          price: 300,
          cost: 150,
          category: "Boisson",
          quantity: 10,
        },
      ],
      cash_given: 3000,
    });

    const afterSaleA = await listProducts();
    expect(afterSaleA.find((p) => p.id === product.id)?.stock).toBe(90);
    await exchangeOps(relay.client);

    // Appareil B (hors-ligne) : reçoit le produit + la vente A, vend 5 de plus, pousse.
    // B s'appaire avec le code du propriétaire : sans quoi A ne connaîtrait pas sa clé et
    // refuserait la vente de B — ce qui est exactement le comportement voulu.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    await exchangeOps(relay.client);
    const pB = (await listProducts()).find((p) => p.id === product.id);
    expect(pB?.stock).toBe(90); // A a déjà vendu 10

    await createSale({
      lines: [
        {
          product_id: product.id,
          name: "Eau 1L",
          price: 300,
          cost: 150,
          category: "Boisson",
          quantity: 5,
        },
      ],
      cash_given: 1500,
    });

    const afterSaleB = await listProducts();
    expect(afterSaleB.find((p) => p.id === product.id)?.stock).toBe(85);
    await exchangeOps(relay.client);

    // Troisième appareil converge : les deux ventes sont visibles. Il s'appaire comme
    // les autres, sinon il n'a la clé de personne et ne peut rien appliquer.
    await freshDevice();
    await joinAs("employee", pairCode ?? undefined);
    const final = await exchangeOps(relay.client);
    expect(final.applied).toBeGreaterThanOrEqual(2);

    const finalSales = await listSales();
    expect(finalSales.length).toBe(2);

    // Le stock final reflète les deux ventes (100 - 10 - 5 = 85)
    const finalProducts = await listProducts();
    expect(finalProducts.find((p) => p.id === product.id)?.stock).toBe(85);
  });
});

// ─── Scénario 5 : garde d'accès par rôle ──────────────────────────────────────
describe("sync temps réel : garde d'accès par rôle", () => {
  it("un employé peut accéder à /dashboard, /pos, /stocks et /settings", () => {
    expect(canAccessRoute("/dashboard", "employee")).toBe(true);
    expect(canAccessRoute("/pos", "employee")).toBe(true);
    expect(canAccessRoute("/stocks", "employee")).toBe(true);
    // /settings est ouvert à l'employé MAIS réduit à la seule demande de suppression
    // de compte — c'est la page elle-même qui masque le reste (EmployeeAccountPanel).
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
