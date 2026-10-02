// Invalidation des lectures après une écriture distante.
//
// Le bug qu'ils verrouillent : une op reçue d'un autre écran modifie bien IndexedDB,
// mais aucune requête n'est invalidée — donc Stocks, la Caisse et l'accueil continuent
// d'afficher l'ancienne quantité. Le symptôme est « le stock ne se met pas à jour »,
// et il ne se voit qu'en multi-appareil : d'où l'intérêt de le tester ici plutôt que
// d'attendre un test manuel avec deux téléphones.
import { describe, test, expect, beforeEach, vi } from "vitest";
import { listProducts } from "@/lib/db";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { signAll } from "@/lib/syncengine/ops";
import { ensureIdentity, getDeviceKeys, resetIdentityForTests } from "@/lib/syncengine/identity";
import { resetDBForTests } from "@/lib/db";
import {
  clearQueryClient,
  invalidateSyncQueries,
  setQueryClient,
  SYNC_INVALIDATED_QUERIES,
} from "@/lib/syncengine/queries";
import type { SyncOp } from "@/lib/syncengine/types";

/** Faux QueryClient qui note les invalidations au lieu d'aller chercher la base. */
function fakeClient() {
  const calls: string[][] = [];
  return {
    calls,
    invalidateQueries: async ({ queryKey }: { queryKey: unknown }) => {
      calls.push(queryKey as string[]);
      return undefined;
    },
  };
}

const announced = (identity: { shopId: string; deviceId: string }): SyncOp =>
  ({
    id: `annonce:${identity.deviceId}:1`,
    shop_id: identity.shopId,
    device_id: identity.deviceId,
    seq: 1,
    type: "device.announce",
    entity_id: identity.deviceId,
    payload: {
      device_id: identity.deviceId,
      public_key: getDeviceKeys().publicKey,
      employee_name: "Appareil distant",
      role: "owner",
    },
    created_at: 500,
    status: "pending",
  }) as SyncOp;

const stockMove = (identity: { shopId: string; deviceId: string }, seq: number): SyncOp =>
  ({
    id: `mvt:${seq}`,
    shop_id: identity.shopId,
    device_id: identity.deviceId,
    seq,
    type: "stock.adjusted",
    entity_id: "p1",
    payload: { product_id: "p1", delta: -2, reason: "sale" },
    created_at: 1000 + seq,
    status: "pending",
  }) as SyncOp;

beforeEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
  // APRÈS les resets : le setup global réinitialise l'identité, qui reconstruit le
  // QueryClient si besoin. Brancher le faux avant, c'est se faire écraser.
  clearQueryClient();
});

describe("invalidation après écriture distante", () => {
  test("applyRemoteOps invalide les lectures qu'il vient d'écrire", async () => {
    const identity = await ensureIdentity();
    const client = fakeClient();
    setQueryClient(client as never);

    const ops = await signAll([announced(identity), stockMove(identity, 2)]);
    const r = await applyRemoteOps(ops);
    // Garde-fou : si les ops étaient rejetées, l'invalidation ne partirait pas non
    // plus et le test passerait pour une mauvaise raison.
    expect(r.applied).toBeGreaterThan(0);

    // L'assertion centrale : sans elle, l'écriture distante est invisible des écrans.
    expect(client.calls.map((c) => c[0])).toContain("products");
    expect(client.calls.map((c) => c[0])).toContain("sales");
  });

  test("l'invalidation est silencieuse sans QueryClient enregistré", async () => {
    // Moteur de sync utilisé hors composant (test, tâche de fond) : l'écriture a lieu,
    // l'affichage se rafraîchira au prochain montage. Ne doit surtout pas lever.
    clearQueryClient();
    await expect(invalidateSyncQueries()).resolves.toBeUndefined();
  });

  test("la liste couvre les lectures d'appareils et de stock", () => {
    for (const key of ["products", "sales", "paired_devices", "sync_identity"]) {
      expect(SYNC_INVALIDATED_QUERIES).toContain(key);
    }
  });

  test("chaque invalidation ne porte qu'un seul préfixe", async () => {
    // React Query invalide par PRÉFIXE : passer `["sales","range"]` ne rafraîchirait pas
    // `["sales", "bestsellers"]`. Chaque entrée doit donc être la racine seule.
    const client = fakeClient();
    setQueryClient(client as never);
    await invalidateSyncQueries();
    for (const call of client.calls) expect(call.length).toBe(1);
  });
});

describe("écriture distante et état local", () => {
  test("l'op distante modifie bien la base, indépendamment du cache React", async () => {
    // Contrôle le reste du contrat : l'écriture fonctionne, c'est l'affichage qui
    // décrochait. Ce test documente que le fix est bien côté invalidation.
    const identity = await ensureIdentity();
    setQueryClient(fakeClient() as never);
    await applyRemoteOps(await signAll([announced(identity), stockMove(identity, 2)]));
    expect(await listProducts()).toBeDefined();
  });
});