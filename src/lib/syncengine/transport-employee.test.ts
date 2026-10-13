// Cycle employé : une sélection de partage qui ne change pas n'est pas réémise même si
// le stock d'un produit privé bouge, et une vente d'employé republie l'instantané via
// le cycle du propriétaire.
import { describe, it, expect } from "vitest";
import { addProduct, addStock, createSale, getDB, listSales, setShopAccount } from "../db";
import { ensureIdentity, getIdentity, setIdentityRole } from "./identity";
import { announceDevice } from "./pairing";
import { exchangeOps } from "./transport";
import { saveShareDecision } from "./sharing";
import { ACCOUNT, LINE, freshDevice, makeRelay, pairPeer } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("une sélection qui ne change pas n'est pas réémise, même si le stock du reste bouge", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();
    await pairPeer("yves");

    const partage = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    const prive = await addProduct({
      name: "Caisse register",
      price: 90000,
      cost: 90000,
      category: "Materiel",
      stock: 1,
    });
    await saveShareDecision("yves", "selection", [partage.id]);

    /** Les instantanés que le relais détient pour « yves », et leur contenu. */
    const partsPourYves = async () => {
      const remote = await relay.client.pull(id.shopId, id.deviceId);
      return remote
        .filter((o) => o.type === "catalogue.snapshot")
        .map(
          (o) =>
            o.payload as {
              target_device_id?: string;
              products: Array<{ id: string; stock: number }>;
            },
        )
        .filter((p) => p.target_device_id === "yves");
    };

    await exchangeOps(relay.client);
    expect(await partsPourYves()).toHaveLength(1);

    // Le produit NON partagé bouge : Jean-Yves n'a pas à le recevoir, donc AUCUN
    // instantané ne repart pour lui — même si la fenêtre du pair est ouverte.
    await getDB().paired_devices.update("yves", { shared_published_at: Date.now() - 60_000 });
    await addStock(prive.id, 5);
    await exchangeOps(relay.client);
    expect(await partsPourYves()).toHaveLength(1);

    // Son produit partagé bouge, lui → republication, et il ne reçoit QUE le sien.
    await getDB().paired_devices.update("yves", { shared_published_at: Date.now() - 60_000 });
    await addStock(partage.id, 3);
    await exchangeOps(relay.client);

    const parts = await partsPourYves();
    expect(parts).toHaveLength(2);
    expect(parts[1].products.map((p) => p.id)).toEqual([partage.id]);
    expect(parts[1].products[0].stock).toBe(9);
  });

  it("une vente d'employé republie l'instantané via le cycle du propriétaire", async () => {
    // La caisse employé vend : ops product.created + sale.created posées au relais.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("employee");
    const employeeId = getIdentity().deviceId;
    const relay = makeRelay();
    // L'employé s'annonce : sans cette clé chez le propriétaire, ses ops sont refusées.
    await announceDevice();

    const product = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    await createSale({ lines: [LINE(product.id)], cash_given: 1200 });
    await exchangeOps(relay.client); // l'employé pousse ses ops (un employé ne publie pas d'instantané)

    // Le propriétaire (base neuve, même groupe) tire et applique la vente. L'employé est
    // appairé chez lui (son annonce le dit) : c'est à CE peer-là qu'il renverra son stock.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const ownerId = getIdentity().deviceId;
    expect(ownerId).not.toBe(employeeId);

    await exchangeOps(relay.client);
    expect((await listSales()).length).toBe(1); // la vente de l'employé est appliquée
    // L'annonce de l'employé l'a inscrit au registre → le propriétaire lui répond avec le
    // sous-catalogue de SA fiche (par défaut : tout, comme avant ce choix par employé).
    await pairPeer(employeeId);

    await exchangeOps(relay.client);
    const remote = await relay.client.pull(getIdentity().shopId, ownerId);
    const snapshots = remote.filter((o) => o.type === "catalogue.snapshot");
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const payload = snapshots.at(-1)!.payload as {
      target_device_id?: string;
      products: Array<{ id: string; stock: number }>;
    };
    expect(payload.target_device_id).toBe(employeeId);
    expect(payload.products.find((p) => p.id === product.id)?.stock).toBe(4); // 6 − 2 vendus
  });
});
