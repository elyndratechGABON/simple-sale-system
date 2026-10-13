import { resetDBForTests } from "../db";
import { ensureIdentity, getDeviceKeys, resetIdentityForTests } from "./identity";
import { signAll } from "./ops";
import { relayTransport } from "./transport";
import type { DeviceAnnouncePayload, SyncOp } from "./types";

export const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };

export async function freshDevice(): Promise<void> {
  await resetDBForTests();
  resetIdentityForTests();
}

/** Relais de test identique à celui du transport : un Map `shop_id → ops[]`. */
export function makeRelay() {
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

/** Une op `device.announce` SYNTHÉTIQUE, telle qu'un pair étranger l'aurait émise.
 *
 *  Signée par la clé de l'appareil COURANT : le pair est simulé dans le même process,
 * et la seule clé privée disponible est celle-ci. La signature est donc valide — ce qui
 * est le point : ces tests portent sur la DÉCISION d'appairage (code juste, faux,
 *  expiré, sans code), pas sur la cryptographie (c'est `signature.test.ts`). */
export async function announceOp(
  shopId: string,
  deviceId: string,
  seq: number,
  over: Partial<DeviceAnnouncePayload> = {},
): Promise<SyncOp> {
  const [signed] = await signAll([
    {
      id: `pair:${seq}`,
      shop_id: shopId,
      device_id: deviceId,
      seq,
      type: "device.announce",
      entity_id: deviceId,
      payload: {
        device_id: deviceId,
        public_key: getDeviceKeys().publicKey,
        employee_name: "Écran",
        role: "employee",
        ...over,
      },
      created_at: 1000 + seq,
      status: "synced",
    } as SyncOp,
  ]);
  return signed;
}

export const PAIR_SHOP = (deviceId: string) =>
  `s_${deviceId.toLowerCase().replace(/-/g, "").slice(0, 12)}`;
