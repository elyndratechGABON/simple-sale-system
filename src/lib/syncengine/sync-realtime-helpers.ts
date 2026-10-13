import { resetDBForTests, setShopAccount } from "../db";
import { ensureIdentity, getIdentity, resetIdentityForTests, setIdentityRole } from "./identity";
import { listPairedDevices } from "./peers";
import { exchangeOps, relayTransport } from "./transport";
import { announceDevice, approveDevice, generatePairingCode } from "./pairing";
import type { SyncOp } from "./types";

export const ACCOUNT = { name: "Boutique Test", phone: "+24100000000", password: "secret" };

export async function freshDevice(): Promise<void> {
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
export async function joinAs(role: "owner" | "employee", pairCode?: string): Promise<void> {
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
export async function ownerApprovesPending(relay: ReturnType<typeof makeRelay>): Promise<void> {
  await joinAs("owner");
  await exchangeOps(relay.client);
  const pending = (await listPairedDevices(getIdentity().shopId)).filter(
    (d) => d.status === "pending" && d.public_key,
  );
  for (const peer of pending) await approveDevice(peer.id, "employee");
  await exchangeOps(relay.client);
}

/** Relais de test : un Map `shop_id → ops[]`, servi par un mock `fetch`. */
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
