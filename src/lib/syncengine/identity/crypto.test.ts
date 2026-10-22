// Le corps canonique d'une opération est signé par la CAISSE et vérifié par le
// CLOUD (backend/op-signature.mjs côté serveur). Les deux implémentations vivent
// dans deux dépôts : si l'une bouge sans l'autre, TOUTE opération distante est
// rejetée en silence (c'est exactement le bug qu'a causé la signature canonique).
//
// Ce vecteur est donc ÉPINGLÉ des deux côtés : ici, et dans
// `backend/tests/op-signature.test.mjs` côté serveur. Un changement d'un côté doit
// casser le test de l'autre.
import { describe, expect, it } from "vitest";
import { signableBody } from "./crypto";
import type { SyncOp } from "../types";

const OP: SyncOp = {
  id: "op-1",
  shop_id: "s_42",
  device_id: "dev-1",
  seq: 7,
  type: "sale.created",
  entity_id: "v-1",
  payload: { total: 100, items: [{ qte: 2, sku: "A" }], client: { nom: "Ada" } },
  created_at: 1700000000000,
  status: "synced",
};

// ── LE VECTEUR ÉPINGLÉ ───────────────────────────────────────────────────────────
//
// Ce corps exact est celui que le cloud vérifie. Ne pas le modifier sans modifier
// `backend/tests/op-signature.test.mjs` côté serveur (et inversement).
const CORPS_EPINGLE =
  '{"id":"op-1","shop_id":"s_42","device_id":"dev-1","seq":7,"type":"sale.created",' +
  '"entity_id":"v-1","payload":{"client":{"nom":"Ada"},"items":[{"qte":2,"sku":"A"}],"total":100},' +
  '"created_at":1700000000000}';

describe("corps canonique d'une opération", () => {
  it("est ÉPINGLÉ (le cloud vérifie exactement cela)", () => {
    expect(signableBody(OP)).toBe(CORPS_EPINGLE);
  });

  it("ne dépend pas de l'ordre des clés de la charge utile", () => {
    const desordre: SyncOp = {
      ...OP,
      payload: { client: { nom: "Ada" }, items: [{ sku: "A", qte: 2 }], total: 100 },
    };
    expect(signableBody(desordre)).toBe(CORPS_EPINGLE);
  });
});
