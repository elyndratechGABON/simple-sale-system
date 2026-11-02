import type { SyncOp } from "../types";
import type { TransportClient } from "./types";

/** Adaptateur du relais PC Master en HTTP. `fetchImpl` injectable pour les tests.
 *  Échec = `false` / `[]`, jamais de throw — le relais est un accessoire, pas un goulot.
 *  Un time-out annule la requête : un réseau à moitié ouvert ne doit pas laisser la
 *  promesse de synchro pendre indéfiniment.
 *
 *  ⚠️ LE PUSH A UN TIMEOUT PROPRE (45 s) : c'est la seule requête qui UPLOADE un
 *  volume réel — un `catalogue.snapshot` porte les photos dataURL de tout le
 *  catalogue partagé (plusieurs centaines de Ko, voire ~1 Mo). À 100 Ko/s sur un
 *  réseau mobile, l'upload dépassait les 10 s du timeout court : la requête était
 *  abortée (408), le push renvoyait `false`, et le cycle suivant RÉÉSSAYAIT pour
 *  re-aborter — les produits n'arrivaient JAMAIS chez l'employé pendant que ses
 *  ventes (quelques octets) arrivaient toujours chez le patron. Le tirage (pull)
 *  ne fait que TÉLÉCHARGER (bande montante rapide) : il garde le timeout court. */
const FETCH_TIMEOUT_MS = 10_000;
const PUSH_TIMEOUT_MS = 45_000;

export function relayTransport(
  baseUrl: string,
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch,
  opsToken = "",
): TransportClient {
  const authHeaders: Record<string, string> = opsToken ? { "x-ops-token": opsToken } : {};
  const timedFetch: typeof fetchImpl = async (input, init) => {
    const isPush = init?.method === "POST";
    const timeout = isPush ? PUSH_TIMEOUT_MS : FETCH_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (error) {
      // Une annulation volontaire se signale comme un AbortError — neutralisable comme
      // toute erreur réseau : le relais est muet pour la caisse.
      if (error instanceof DOMException && error.name === "AbortError") {
        return new Response(null, { status: 408 });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
  return {
    async push(shopId: string, ops: SyncOp[]): Promise<boolean> {
      if (ops.length === 0) return true;
      try {
        const body = JSON.stringify({ shop_id: shopId, ops });
        const res = await timedFetch(`${baseUrl}/api/v1/ops`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body,
        });
        if (!res.ok) {
          // DIAGNOSTIC : un push qui échoue devait laisser une trace — taille du
          // corps (limite Vercel : 4,5 Mo par requête), statut du relais. Sans ce
          // log, « les produits n'arrivent jamais » était indépendable.
          console.error(
            `[relais] push refusé : ${res.status} (${ops.length} op(s), ${(body.length / 1024).toFixed(0)} Ko)`,
          );
        }
        return res.ok;
      } catch (e) {
        console.error("[relais] push échoué (réseau/timeout) :", e);
        return false;
      }
    },
    async pull(shopId: string, deviceId: string): Promise<SyncOp[]> {
      try {
        const res = await timedFetch(
          `${baseUrl}/api/v1/ops?shop_id=${encodeURIComponent(shopId)}` +
            `&device_id=${encodeURIComponent(deviceId)}`,
          { headers: authHeaders },
        );
        if (!res.ok) return [];
        const data = (await res.json().catch(() => null)) as { ops?: SyncOp[] } | null;
        return Array.isArray(data?.ops) ? data.ops : [];
      } catch {
        return [];
      }
    },
    // La preuve de vie des écrans du groupe : quand chacun a-t-il tiré ses ops.
    // Un relais qui ne sait pas le dire renvoie une liste vide — l'interface
    // affiche alors l'ancienne information, sans planter.
    async peers(shopId: string): Promise<{ device_id: string; last_pulled_at: number }[]> {
      try {
        const res = await timedFetch(
          `${baseUrl}/api/v1/ops/peers?shop_id=${encodeURIComponent(shopId)}`,
          { headers: authHeaders },
        );
        if (!res.ok) return [];
        const data = (await res.json().catch(() => null)) as {
          peers?: { device_id: string; last_pulled_at: number }[];
        } | null;
        return Array.isArray(data?.peers) ? data.peers : [];
      } catch {
        return [];
      }
    },
  };
}
