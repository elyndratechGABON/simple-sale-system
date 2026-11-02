// SCÉNARIOS 1 & 2 de la synchro à 3 niveaux (mission) : le push part QUAND MÊME quand
// le patron est hors-ligne (relais temporaire), mais la copie locale bascule `sent`
// au lieu d'être acquittée ; le patron online (ou son absence d'API presence paliée par
// la preuve de vie `peers`) conserve l'ancien chemin direct.
import { describe, it, expect } from "vitest";
import { addProduct, getDB, setShopAccount } from "../db";
import { ensureIdentity, getIdentity, setIdentityRole } from "./identity";
import { exchangeOps, type TransportClient } from "./transport";
import { listPendingOps, listSentOps } from "./outbox";
import { ACCOUNT, freshDevice, makeRelay } from "./transport-helpers";

/** Installe l'appareil local en EMPLOYÉ avec un patron appairé au registre. */
async function enEmploye(): Promise<string> {
  await freshDevice();
  await setShopAccount(ACCOUNT);
  await ensureIdentity();
  const identity = await setIdentityRole("employee");
  const shopId = identity.shopId;
  await getDB().paired_devices.put({
    id: "patron",
    shop_id: shopId,
    role: "owner",
    status: "paired",
    updated_at: Date.now(),
  });
  return shopId;
}

async function uneVenteEnAttente(shopId: string): Promise<number> {
  await addProduct({
    name: "Coca 1L",
    cost: 300,
    price: 600,
    stock: 10,
    category: "Boisson",
  });
  const pending = await listPendingOps(shopId);
  expect(pending.length).toBeGreaterThan(0);
  return pending.length;
}

describe("synchro 3 niveaux — présence du patron", () => {
  it("SCÉNARIO 2 — patron offline (pas d'API presence, pas de preuve de vie) : l'op part au relais MAIS reste `sent` dans l'outbox", async () => {
    const shopId = await enEmploye();
    const attendus = await uneVenteEnAttente(shopId);
    const relay = makeRelay();

    const state = await exchangeOps(relay.client);

    expect(state.pushed).toBe(attendus);
    expect(state.held).toBe(attendus);
    // Le relais a reçu l'op (relais temporaire — rien n'est perdu).
    expect(relay.count(shopId)).toBe(attendus);
    // La caisse, elle, ne se croit PAS acquittée : copie `sent`, en attente d'ACK.
    expect(await listPendingOps(shopId)).toHaveLength(0);
    const sent = await listSentOps(shopId);
    expect(sent).toHaveLength(attendus);
    expect(sent.every((o) => o.status === "sent" && (o.sent_at ?? 0) > 0)).toBe(true);
  });

  it("SCÉNARIO 1 — patron online du côté de l'API presence : push direct, ACK immédiat, pas d'op `sent`", async () => {
    const shopId = await enEmploye();
    const attendus = await uneVenteEnAttente(shopId);
    const relay = makeRelay();
    // Le relais expose /api/v1/presence et voit le patron.
    const client: TransportClient = {
      ...relay.client,
      presence: async (s) => (s === shopId ? { online: ["patron"] } : null),
    };

    const state = await exchangeOps(client);

    expect(state.pushed).toBe(attendus);
    expect(state.held ?? 0).toBe(0);
    expect(relay.count(shopId)).toBe(attendus);
    expect(await listPendingOps(shopId)).toHaveLength(0);
    expect(await listSentOps(shopId)).toHaveLength(0);
  });

  it("REPLI — relais sans /api/v1/presence : la preuve de vie `peers()` du patron décide tout seul", async () => {
    const shopId = await enEmploye();
    await uneVenteEnAttente(shopId);
    const relay = makeRelay();
    const toutRecemment = Date.now();
    const client: TransportClient = {
      ...relay.client,
      peers: async (s) =>
        s === shopId ? [{ device_id: "patron", last_pulled_at: toutRecemment }] : [],
    };

    const state = await exchangeOps(client);

    expect(state.held ?? 0).toBe(0);
    expect(await listSentOps(shopId)).toHaveLength(0);
    // Et la variante sombre : le patron vu pour la DERNIÈRE fois il a plus de 7 min.
    const clientAbsent: TransportClient = {
      ...client,
      peers: async (s) =>
        s === shopId ? [{ device_id: "patron", last_pulled_at: toutRecemment - 10 * 60_000 }] : [],
    };
    await addProduct({ name: "Fanta 1L", cost: 300, price: 600, stock: 5, category: "Boisson" });
    const stateAbsent = await exchangeOps(clientAbsent);
    expect(stateAbsent.held).toBeGreaterThan(0);
    expect((await listSentOps(shopId)).length).toBeGreaterThan(0);
  });

  it("RATTRAPAGE — l'ACK du patron fait passer les ops `sent` à `synced` (markOpsSynced)", async () => {
    const shopId = await enEmploye();
    await uneVenteEnAttente(shopId);
    const relay = makeRelay();
    await exchangeOps(relay.client);
    const sent = await listSentOps(shopId);
    expect(sent.length).toBeGreaterThan(0);

    const { markOpsSynced } = await import("./outbox");
    await markOpsSynced(sent.map((o) => o.id));
    expect(await listSentOps(shopId)).toHaveLength(0);
  });

  it("NEUTRE — un propriétaire qui pousse n'a pas de presence à vérifier : chemin direct intact", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;
    await uneVenteEnAttente(shopId);
    const relay = makeRelay();

    const state = await exchangeOps(relay.client);

    expect(state.pushed).toBeGreaterThan(0);
    expect(state.held ?? 0).toBe(0);
    expect(await listSentOps(shopId)).toHaveLength(0);
  });

  it("SCÉNARIO 3 — TTL 7 jours : une op `sent` trop vieille repasse `pending` et re-part au relais", async () => {
    const shopId = await enEmploye();
    await uneVenteEnAttente(shopId);
    const relay = makeRelay();
    await exchangeOps(relay.client); // patron offline → `sent`
    const avant = (await listSentOps(shopId))[0];
    expect(avant).toBeDefined();

    // Vieillir l'horodatage au-delà du TTL (7 j + 1 h), comme le ferait le temps réel.
    await getDB().sync_ops.update(avant!.id, {
      sent_at: Date.now() - 7.1 * 24 * 60 * 60 * 1000,
    });

    const state = await exchangeOps(relay.client); // toujours offline

    // Aucune vente lâchée : l'op a été repoussée (re-`sent`, l'ACK attend le patron).
    expect(state.pushed).toBeGreaterThan(0);
    expect(await listPendingOps(shopId)).toHaveLength(0);
    expect((await listSentOps(shopId)).map((o) => o.id)).toContain(avant!.id);
    expect((await listSentOps(shopId))[0]!.sent_at!).toBeGreaterThan(Date.now() - 60_000);
  });

  it("SCÉNARIO 4 — LE RETOUR DU PATRON : les `sent` rebasculent et repartent DU MÊME cycle, acquittées", async () => {
    const shopId = await enEmploye();
    await uneVenteEnAttente(shopId);
    const relay = makeRelay();
    await exchangeOps(relay.client); // patron offline → `sent`
    expect((await listSentOps(shopId)).length).toBeGreaterThan(0);

    // Le patron REVIENT : l'API presence le voit.
    const client: TransportClient = {
      ...relay.client,
      presence: async (s) => (s === shopId ? { online: ["patron"] } : null),
    };

    const state = await exchangeOps(client);

    expect(state.held ?? 0).toBe(0);
    // L'op a rebasculé `pending`, été repoussée puis acquittée : plus rien en `sent`
    // ni en `pending`, et le relais conserve son dépôt (idempotent, pas de doublon).
    expect(await listSentOps(shopId)).toHaveLength(0);
    expect(await listPendingOps(shopId)).toHaveLength(0);
    expect(relay.count(shopId)).toBeGreaterThan(0);
  });

  it("NEUTRE — un propriétaire qui pousse n'a pas de presence à vérifier : chemin direct intact", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const shopId = getIdentity().shopId;
    await uneVenteEnAttente(shopId);
    const relay = makeRelay();

    const state = await exchangeOps(relay.client);

    expect(state.pushed).toBeGreaterThan(0);
    expect(state.held ?? 0).toBe(0);
    expect(await listSentOps(shopId)).toHaveLength(0);
  });
});
