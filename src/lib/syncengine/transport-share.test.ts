// Décisions de partage du propriétaire : chaque employé ne reçoit que SON sous-catalogue,
// le propriétaire republie à chaque employé et seulement quand la part concernée change.
import { describe, it, expect } from "vitest";
import { addProduct, addStock, getDB, setShopAccount } from "../db";
import { ensureIdentity, getDeviceKeys, getIdentity } from "./identity";
import { exchangeOps } from "./transport";
import { listPendingOps } from "./outbox";
import { signAll } from "./ops";
import { publishShareNow, saveShareDecision } from "./sharing";
import type { SyncOp } from "./types";
import { generatePairingCode } from "./pairing";
import { ACCOUNT, freshDevice, makeRelay, pairPeer } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("n'envoie à un employé que le sous-catalogue choisi pour lui", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    const coca = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
      photo: "data:image/webp;base64,test",
    });
    const pain = await addProduct({
      name: "Pain",
      price: 100,
      cost: 40,
      category: "Boulangerie",
      stock: 6,
    });
    await addStock(coca.id, 5);

    // Deux employés, deux choix : Fatou aura tout, Jean-Yves seulement le Pain.
    await pairPeer("fatu");
    await pairPeer("yves");
    await saveShareDecision("fatu", "all", []);
    await saveShareDecision("yves", "selection", [pain.id]);

    await publishShareNow("fatu");
    await publishShareNow("yves");
    await exchangeOps(relay.client);
    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const snaps = remote.filter((o) => o.type === "catalogue.snapshot");
    const partages = snaps.map(
      (o) =>
        o.payload as {
          target_device_id?: string;
          products: Array<{ id: string; stock: number; photo?: unknown }>;
        },
    );

    const fatou = partages.find((p) => p.target_device_id === "fatu");
    expect(fatou?.products.map((p) => p.id).sort()).toEqual([coca.id, pain.id].sort());
    // Le stock ABSOLU courant voyage ; la photo NON (mission anti-crash : les images
    // restent dans la table products de chaque écran, jamais dans le journal d'ops).
    expect(fatou?.products.find((p) => p.id === coca.id)?.stock).toBe(15);
    expect(fatou?.products.find((p) => p.id === coca.id)?.photo).toBeUndefined();
    const imageOp = remote.find(
      (op) =>
        op.type === "product.image_updated" &&
        (op.payload as { target_device_id?: string }).target_device_id === "fatu",
    );
    expect(imageOp?.entity_id).toBe(coca.id);
    expect((imageOp?.payload as { image_base64?: string }).image_base64).toBe(
      "data:image/webp;base64,test",
    );
    expect(remote.findIndex((op) => op.type === "catalogue.snapshot")).toBeLessThan(
      remote.findIndex((op) => op.type === "product.image_updated"),
    );

    const yves = partages.find((p) => p.target_device_id === "yves");
    expect(yves?.products.map((p) => p.id)).toEqual([pain.id]);
  });

  it("un écran qui rejoint ne reçoit pas de stock avant le transfert manuel", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();
    await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    // Un premier employé, déjà servi.
    await pairPeer("fatu");
    await exchangeOps(relay.client);

    // Un second écran se présente, avec le code de paire du propriétaire.
    const code = await generatePairingCode();
    const [announce] = await signAll([
      {
        id: "annonce:guillaume:1",
        shop_id: id.shopId,
        device_id: "guillaume",
        seq: 1,
        type: "device.announce",
        entity_id: "guillaume",
        payload: {
          device_id: "guillaume",
          public_key: getDeviceKeys().publicKey,
          employee_name: "Guillaume",
          role: "employee",
          pair_code: code,
        },
        created_at: Date.now(),
        status: "pending",
      } as SyncOp,
    ]);
    await relay.client.push(id.shopId, [announce]);

    await exchangeOps(relay.client);
    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const snapshots = remote.filter((o) => o.type === "catalogue.snapshot");
    expect(
      snapshots.some(
        (o) => (o.payload as { target_device_id?: string }).target_device_id === "guillaume",
      ),
    ).toBe(false);

    await publishShareNow("guillaume");
    await exchangeOps(relay.client);
    const afterManualTransfer = await relay.client.pull(id.shopId, id.deviceId);
    const pourGuillaume = afterManualTransfer
      .filter((o) => o.type === "catalogue.snapshot")
      .find((o) => (o.payload as { target_device_id?: string }).target_device_id === "guillaume");
    expect(pourGuillaume).toBeDefined();
    expect(
      (pourGuillaume!.payload as { products: Array<{ name: string }> }).products.map((p) => p.name),
    ).toContain("Coca 1L");
  });

  it("un pair jamais servi attend le déclenchement manuel du transfert", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();
    await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    // Un pair appairé, jamais servi.
    await pairPeer("jacques");

    await exchangeOps(relay.client);
    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const auto = remote
      .filter((o) => o.type === "catalogue.snapshot")
      .find((o) => (o.payload as { target_device_id?: string }).target_device_id === "jacques");
    expect(auto).toBeUndefined();

    await publishShareNow("jacques");
    await exchangeOps(relay.client);
    const afterManualTransfer = await relay.client.pull(id.shopId, id.deviceId);
    expect(
      afterManualTransfer
        .filter((o) => o.type === "catalogue.snapshot")
        .some((o) => (o.payload as { target_device_id?: string }).target_device_id === "jacques"),
    ).toBe(true);
  });

  it("le propriétaire republie à chaque employé, et seulement quand SA part change", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    // Un employé appairé : c'est pour LUI que le propriétaire publie.
    await pairPeer("fatu");

    const product = await addProduct({
      name: "Coca 1L",
      price: 600,
      cost: 300,
      category: "Boisson",
      stock: 10,
    });
    await publishShareNow("fatu");
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(2); // product.created + son instantané
    expect((await listPendingOps(id.shopId)).length).toBe(0); // tout poussé et acquitté

    // Rien n'a changé au cycle suivant → le relais ne reçoit AUCUNE op de plus.
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(2);

    // Le stock bouge (réappro) → republication au stock ABSOLU courant (15).
    // On fait vieillir la fenêtre anti-spam DE L'ÉCRAN : c'est elle qui décide, pas un
    // délai global (sinon la part d'un employé qui change serait bloquée par le stock
    // d'un autre).
    await getDB().paired_devices.update("fatu", {
      shared_published_at: Date.now() - 60_000,
    });
    await addStock(product.id, 5);
    await exchangeOps(relay.client);
    expect(relay.count(id.shopId)).toBe(4); // stock.adjusted + instantané republié

    const remote = await relay.client.pull(id.shopId, id.deviceId);
    const last = remote.filter((o) => o.type === "catalogue.snapshot").at(-1)!;
    const payload = last.payload as { products: Array<{ id: string; stock: number }> };
    expect(payload.products.find((p) => p.id === product.id)?.stock).toBe(15);
  });
});
