// Applicabilité des instantanés : un snapshot destiné à un AUTRE écran est ignoré sans
// toucher au catalogue, un snapshot sans destinataire reste applicable (historique), et
// un écran neuf bootstrappe son catalogue à partir d'un lot annonce + snapshot.
import { describe, it, expect } from "vitest";
import { listProducts, setShopAccount } from "../db";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ensureIdentity, getIdentity } from "./identity";
import { exchangeOps } from "./transport";
import { ACCOUNT, announceOpFor, freshDevice, makeRelay } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("un instantané destiné à un autre écran est ignoré, sans toucher au catalogue", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    const snapOp = await relay.asPeer({
      id: "snap:autre",
      device_id: "proprietaire",
      payload: {
        target_device_id: "employe-distant",
        products: [
          {
            id: "p1",
            name: "Coca 1L",
            price: 600,
            cost: 300,
            category: "Boisson",
            stock: 15,
            updated_at: 0,
            sync_status: "local",
          },
        ],
      },
      status: "synced",
    });
    await applyRemoteOpsSigned([await announceOpFor("proprietaire"), snapOp]);
    // Le partage est une décision du PROPRIÉTAIRE : un instantané qui ne me vise pas ne
    // crée rien chez moi. Sans ce filtre, tout le groupe recevait tout le catalogue.
    expect((await listProducts()).length).toBe(0);
  });

  it("un snapshot sans destinataire reste applicable (historique conservé)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const relay = makeRelay();

    const snapOp = await relay.asPeer({
      id: "snap:sans-cible",
      device_id: "proprietaire",
      payload: {
        products: [
          {
            id: "p1",
            name: "Coca 1L",
            price: 600,
            cost: 300,
            category: "Boisson",
            stock: 15,
            updated_at: 0,
            sync_status: "local",
          },
        ],
      },
      status: "synced",
    });
    await applyRemoteOpsSigned([await announceOpFor("proprietaire"), snapOp]);
    expect((await listProducts()).find((p) => p.id === "p1")?.stock).toBe(15);
  });

  it("applique un snapshot du catalogue sur un écran neuf (stock absolu)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // L'op vient d'un PAIR : son `device_id` n'est pas le nôtre, sa signature doit être
    // valide, et sa clé doit être celle qu'on connaît — d'où l'annonce du pair d'abord.
    const snapOp = await relay.asPeer({
      id: "snap:1",
      device_id: "proprietaire",
      payload: {
        products: [
          {
            id: "p1",
            name: "Coca 1L",
            price: 600,
            cost: 300,
            category: "Boisson",
            stock: 15,
            updated_at: 0,
            sync_status: "local",
          },
        ],
      },
      status: "synced",
    });
    // Annonce ET snapshot dans le MÊME lot : c'est le cas réel — le relais rend tout le
    // groupe d'un coup — et la clé doit être résolue AVANT que le snapshot se vérifie.
    await relay.client.push(id.shopId, [await announceOpFor("proprietaire"), snapOp]);

    await exchangeOps(relay.client);
    const products = await listProducts();
    expect(products.find((p) => p.id === "p1")?.stock).toBe(15);
  });
});
