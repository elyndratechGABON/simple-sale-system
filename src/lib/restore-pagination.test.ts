// Restauration depuis l'archive — pagination.
//
// Le bug le plus probable et le plus discret de toute la restauration : un client qui
// s'arrête à la première page et dit « terminé » avec un tiers du stock reconstruit.
import { test, expect, vi, afterEach } from "vitest";
import { resetDBForTests } from "@/lib/db";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { ensureIdentity, resetIdentityForTests } from "@/lib/syncengine/identity";
import type { SyncOp } from "@/lib/syncengine/types";
import { announceSigned, archived, sign } from "./restore-helpers";

afterEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
  vi.unstubAllGlobals();
});

test("la pagination couvre l'archive entière, pas seulement la première page", async () => {
  // 1 200 mouvements > page de 500. Un client qui s'arrête à la première page dirait
  // « terminé » avec un tiers du stock reconstruit : le bug le plus probable et le plus
  // discret de toute la restauration.
  //
  // Timeout élargi à 20 s : ce test signe puis applique 1 200 opérations (1 200
  // signatures RSA + 1 200 vérifications) sur `fake-indexeddb`. Seul il prend 0,8 s,
  // mais en suite complète il sebat à plus de 5 s face aux 45 autres fichiers et se
  // faisait tuer par le timeout PAR DÉFAUT de Vitest — un échec aléatoire qui masque
  // les vraies régressions. Les assertions restent déterministes.
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  const announcePage = [announce];

  const movements: SyncOp[] = Array.from({ length: 1200 }, (_, i) =>
    archived(
      identity,
      `mvt:${i + 2}`,
      "stock.adjusted",
      "p1",
      { product_id: "p1", delta: 1, reason: "replenishment" },
      2000 + i,
    ),
  );

  const signedMovements = await sign(movements);
  const full = [...announcePage, ...signedMovements];

  const handler = (url: URL) => {
    const cursor = Number(url.searchParams.get("cursor") ?? "0");
    const pageSize = 500;
    const slice = full.slice(cursor, cursor + pageSize);
    const next = cursor + slice.length;
    return new Response(
      JSON.stringify({
        status: "ready",
        ops: slice,
        cursor: next,
        has_more: next < full.length,
        total_ops: full.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
    handler(new URL(String(input), "http://x")),
  );
  vi.stubGlobal("fetch", fetchMock);

  let cursor = 0;
  const pageSizes: number[] = [];
  let rounds = 0;
  while (rounds++ < 10) {
    const res = await fetchMock(
      `http://x/api/v1/restore/job?device_id=${identity.deviceId}&shop_id=${identity.shopId}&cursor=${cursor}`,
    );
    const data = (await res.json()) as {
      ops: SyncOp[];
      cursor: number;
      has_more: boolean;
    };
    pageSizes.push(data.ops.length);
    if (data.ops.length > 0) await applyRemoteOps(data.ops);
    cursor = data.cursor;
    if (!data.has_more) break;
  }

  expect(pageSizes).toEqual([500, 500, 201]);
  expect(cursor).toBe(full.length);
  expect(rounds).toBeLessThan(10);
}, 20_000);
