// La signature des opérations est la seule preuve d'origine d'une op : le relais est
// aveugle et `shop_id` vient du client. Ces tests couvrent la frontière qui compte —
// une op forgée ne doit JAMAIS atteindre les stores, une op réellement émise doit
// toujours passer.
import { describe, it, expect } from "vitest";
import { listProducts, resetDBForTests, setShopAccount } from "../db";
import { applyRemoteOps } from "./apply";
import { ensureIdentity, resetIdentityForTests } from "./identity";
import { opFromA, trustDeviceA } from "./signature-helpers";
import type { SyncOp } from "./types";

describe("signature des opérations", () => {
  it("applique une op signée par un appareil connu", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();
    await trustDeviceA();

    const { applied, skipped } = await applyRemoteOps([await opFromA()]);

    expect(applied).toBe(1);
    expect(skipped).toBe(0);
    expect(await listProducts()).toHaveLength(1);
  });

  it("refuse une op dont le payload a été altéré après signature", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();
    await trustDeviceA();

    const signed = await opFromA();
    // L'attaque : signature valide, prix réécrit à 0.
    const forged: SyncOp = {
      ...signed,
      payload: { product: { id: "p1", name: "Produit", stock: 5, price: 0 } },
    };

    const { applied, skipped } = await applyRemoteOps([forged]);

    expect(applied).toBe(0);
    expect(skipped).toBe(1);
    expect(await listProducts()).toHaveLength(0);
  });

  it("refuse une op sans signature", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();
    await trustDeviceA();

    const signed = await opFromA();
    const { sig: _dropped, ...unsigned } = signed;
    const { applied, skipped } = await applyRemoteOps([unsigned as SyncOp]);

    expect(applied).toBe(0);
    expect(skipped).toBe(1);
    expect(await listProducts()).toHaveLength(0);
  });

  it("refuse une op émise sous un device_id inconnu", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();
    await trustDeviceA();

    // L'attaque : op parfaitement signée par l'appareil A, mais qui se déclare d'un
    // `device_id` inventé — la clé de A ne correspond pas à ce qu'il réclame.
    const spoofed = await opFromA({ device_id: "device-invente" });

    const { applied, skipped } = await applyRemoteOps([spoofed]);

    expect(applied).toBe(0);
    expect(skipped).toBe(1);
    expect(await listProducts()).toHaveLength(0);
  });

  it("reste idempotent : une op déjà consommée est rejouée sans effet", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    await ensureIdentity();
    await trustDeviceA();
    const op = await opFromA();

    await applyRemoteOps([op]);
    const second = await applyRemoteOps([op]);

    expect(second.applied).toBe(0);
    expect(second.skipped).toBe(1);
    expect(await listProducts()).toHaveLength(1);

    await resetDBForTests();
    resetIdentityForTests();
  });
});
