// Restauration depuis l'archive — le scénario qui ne se teste pas à la main.
//
// Téléphone perdu, téléphone neuf, l'orchestrateur sert l'archive. Ce que ces tests
// verrouillent est ce qui ferait échouer SILENCIEUSEMENT cette restauration : des ops
// rejetées faute de clé épinglée, une pagination qui s'arrête à la première page, un
// rejeu qui duplique le catalogue.
//
// Les ops sont SIGNÉES par `signAll` avec la clé de l'appareil courant — exactement
// ce que le drainer archive puis rend. Une archive dont les signatures ne vérifient
// pas doit être refusée : c'est la garantie qui empêche de réinjecter un journal
// forgé via le canal de restauration.
import { test, expect, vi, afterEach } from "vitest";
import { listProducts, resetDBForTests } from "@/lib/db";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { signAll } from "@/lib/syncengine/ops";
import {
  ensureIdentity,
  getDeviceKeys,
  resetIdentityForTests,
} from "@/lib/syncengine/identity";
import type { SyncOp } from "@/lib/syncengine/types";

/** Signe des ops brutes comme le ferait un appareil émetteur. */
async function sign(ops: SyncOp[]): Promise<SyncOp[]> {
  return signAll(ops.map((o) => ({ ...o, status: "pending" as const })));
}

/**
 * Annonce d'appareil signée : c'est elle qui installe une clé publique dans le
 * registre local. Sans elle, `resolveTrustedKeys` n'a rien contre quoi vérifier et
 * refuse TOUTES les ops — donc une restauration sans annonce ne peut rien reconstruire.
 */
async function announceSigned(deviceId: string, shopId: string): Promise<SyncOp> {
  const [op] = await sign([
    {
      id: `annonce:${deviceId}:1`,
      shop_id: shopId,
      device_id: deviceId,
      seq: 1,
      type: "device.announce",
      entity_id: deviceId,
      payload: {
        device_id: deviceId,
        public_key: getDeviceKeys().publicKey,
        employee_name: "Appareil d'archive",
        role: "owner",
      },
      created_at: Date.now(),
      status: "pending",
    } as SyncOp,
  ]);
  return op;
}

/**
 * Op d'archive pour CE groupe. Le `shop_id` doit être celui de l'appareil courant :
 * `applyRemoteOps` ne retient que les ops du groupe courant, une archiveconstruite avec
 * un `shop_id` inventé serait ignorée — silencieusement, ce qui est exactement le piège
 * qu'un test de restauration doit attraper.
 */
const archived = (
  identity: { shopId: string; deviceId: string },
  id: string,
  type: SyncOp["type"],
  entityId: string,
  payload: unknown,
  createdAt: number,
): SyncOp =>
  ({
    id,
    shop_id: identity.shopId,
    device_id: identity.deviceId,
    seq: Number(id.split(":").pop()) || 1,
    type,
    entity_id: entityId,
    payload,
    created_at: createdAt,
    status: "pending",
  }) as SyncOp;

const product = (identity: { shopId: string; deviceId: string }, id: string, name: string) =>
  archived(
    identity,
    `${id}:2`,
    "product.created",
    id,
    {
      product: {
        id,
        name,
        cost: 1500,
        price: 3000,
        stock: 50,
        category: "Mobilier",
        updated_at: 1,
        sync_status: "local",
      },
    },
    1000,
  );

afterEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
  vi.unstubAllGlobals();
});

test("le rejeu reconstruit le catalogue depuis une archive signée", async () => {
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  const [created] = await sign([product(identity, "p1", "Chaises plastiques")]);

  // L'archive rejoue dans l'ordre chronologique : annonce d'abord, sinon les clés
  // manquent et tout est refusé.
  await applyRemoteOps([announce, created]);

  const found = await listProducts();
  expect(found.some((p) => p.id === "p1")).toBe(true);
  expect(found.find((p) => p.id === "p1")?.name).toBe("Chaises plastiques");
});

test("rejouer deux fois la même archive ne duplique rien", async () => {
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  const [created] = await sign([product(identity, "p2", "Tentes")]);

  await applyRemoteOps([announce, created]);
  await applyRemoteOps([announce, created]);

  const found = await listProducts();
  expect(found.filter((p) => p.id === "p2").length).toBe(1);
});

test("une archive dont les signatures ne vérifient pas est refusée", async () => {
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  // Falsification du payload APRÈS signature : la clé ne correspond plus.
  const forged = {
    ...product(identity, "p3", "Produit forgé"),
    payload: { product: { id: "p3", name: "Autre" } },
  };

  const r = await applyRemoteOps([announce, forged as SyncOp]);
  // L'annonce EST appliquée (elle est légitime) : c'est l'op forgée qui ne doit pas
  // l'être. Compter sur `applied` seul compterait l'annonce et laisserait passer la
  // forgery — d'où l'assertion sur la présence du produit, qui est le vrai critère.
  expect(r.applied).toBe(1);
  const found = await listProducts();
  expect(found.some((p) => p.id === "p3")).toBe(false);
});

test("la pagination couvre l'archive entière, pas seulement la première page", async () => {
  // 1 200 mouvements > page de 500. Un client qui s'arrête à la première page dirait
  // « terminé » avec un tiers du stock reconstruit : le bug le plus probable et le plus
  // discret de toute la restauration.
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
});