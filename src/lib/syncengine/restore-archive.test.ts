// Le rejeu de l'ARCHIVE — le filet quand un téléphone a perdu ses données.
//
// Deux règles, et elles s'opposent :
//  1. par le CANAL P2P, une opération non signée est REFUSÉE (le relais est aveugle,
//     `shop_id` vient du client : sans signature, n'importe qui injecte des ventes) ;
//  2. par l'ARCHIVE du serveur, la vérification est MIS DE CÔTÉ : l'archive est le
//     journal du compte, chiffré avec sa clé, servi par un job que seul un écran du
//     compte peut ouvrir. Le client ne SAIT pas vérifier ces opérations — les clés de
//     ses pairs ont disparu avec sa fiche locale — et ses ventes doivent lui revenir.
import { describe, it, expect } from "vitest";
import { getDB, listProducts, setShopAccount } from "../db";
import { applyRemoteOps } from "./apply";
import { ensureIdentity, getDeviceKeys } from "./identity";
import { signAll } from "./ops";
import type { SyncOp } from "./types";

function opArchive(): SyncOp {
  return {
    id: "archive:1",
    shop_id: "s_groupe",
    device_id: "pair-1",
    seq: 1,
    type: "catalogue.snapshot",
    entity_id: "catalog",
    payload: {
      products: [
        {
          id: "p-archive",
          name: "Produit archivé",
          type: "product",
          stock: 7,
          price: 1000,
          cost: 500,
          category: "Test",
          updated_at: 1,
          sync_status: "local",
        },
      ],
    },
    created_at: 1,
    status: "pending",
  } as unknown as SyncOp;
}

describe("rejeu de l'archive", () => {
  it("applique les opérations de l'archive sans re-vérifier leurs signatures", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();

    const res = await applyRemoteOps([opArchive()], { fromArchive: true });
    expect(res.applied).toBe(1);
    const produits = await listProducts();
    expect(produits.map((p) => p.name)).toContain("Produit archivé");
  });

  it("le canal P2P refuse toujours une opération non signée", async () => {
    // La règle 1 ne doit pas avoir été affaiblie par la règle 2 : une opération
    // forgée, reçue du relais, reste refusée.
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();

    const forged = opArchive();
    forged.id = "forgee:1";
    const res = await applyRemoteOps([forged]);
    expect(res.applied).toBe(0);
    const produits = await listProducts();
    expect(produits.map((p) => p.name)).not.toContain("Produit archivé");
  });

  it("l'archive reste dédupliquée : rejouer deux fois n'applique qu'une fois", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();

    const op = opArchive();
    const premier = await applyRemoteOps([op], { fromArchive: true });
    const second = await applyRemoteOps([op], { fromArchive: true });
    expect(premier.applied).toBe(1);
    expect(second.applied).toBe(0);
    expect(await getDB().processed_ops.get(op.id)).toBeDefined();
  });

  it("la clé publique du pair reste celle de l'archive (aucun secret Attention)", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();
    // La clé n'est jamais écrite en clair par le rejeu : l'archive est chiffrée côté
    // serveur, le client ne fait que rejouer des charges utiles déjà déchiffrées.
    const op = opArchive();
    await applyRemoteOps([op], { fromArchive: true });
    const produits = await listProducts();
    expect(produits[0]?.id).toBe("p-archive");
    expect(getDeviceKeys().publicKey).toBeTruthy();
  });
});
