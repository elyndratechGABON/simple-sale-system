// Helpers partagés du transport : un relais simulé (Map `shop_id → ops[]`, mock `fetch`
// du protocole `/api/v1/ops`), l'annonce et la paire d'un pair en base plutôt qu'au
// registre distant, et un compte de test.
import { getDB, resetDBForTests, setShopAccount } from "../db";
import { ensureIdentity, getDeviceKeys, resetIdentityForTests } from "./identity";
import { signAll } from "./ops";
import { relayTransport } from "./transport";
import type { SyncOp } from "./types";

export const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };
export const LINE = (productId: string) => ({
  product_id: productId,
  name: "Coca 1L",
  price: 600,
  cost: 300,
  category: "Boisson" as const,
  quantity: 2,
});

export async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

/**
 * L'annonce d'un pair, comme le relais la verrait : l'appareil local se présente, et le
 * pair d'abord contact est accepté parce que le GROUPE EST VIDE (confiance initiale).
 * C'est cette op qui installe la clé du pair dans le registre local — sans elle, ses
 * autres ops n'ont rien contre quoi se vérifier.
 */
export async function announceOpFor(peerId: string): Promise<SyncOp> {
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
export async function pairPeer(peerId: string): Promise<void> {
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
export function makeRelay(peerSign?: () => Promise<SyncOp[]>) {
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
