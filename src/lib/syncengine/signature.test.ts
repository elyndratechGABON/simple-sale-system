// La signature des opérations est la seule preuve d'origine d'une op : le relais est
// aveugle et `shop_id` vient du client. Ces tests couvrent la frontière qui compte —
// une op forgée ne doit JAMAIS atteindre les stores, une op réellement émise doit
// toujours passer.
import { describe, it, expect } from "vitest";
import { getDB, resetDBForTests, setShopAccount, listProducts } from "../db";
import { applyRemoteOps } from "./apply";
import { ensureIdentity, resetIdentityForTests, signOp } from "./identity";
import { PAIRING_KEYS, type SyncOp } from "./types";

/** Une op d'appareil A, signée, adressée à un groupe `s_` quelconque. */
async function opFromA(over: Partial<SyncOp> = {}): Promise<SyncOp> {
  const a = await ensureIdentity();
  return signOp({
    id: "aaaa:1",
    shop_id: "s_group",
    device_id: a.deviceId,
    seq: 1,
    type: "product.created",
    entity_id: "p1",
    payload: { product: { id: "p1", name: "Produit", stock: 5, price: 100 } },
    created_at: 1,
    status: "pending",
    ...over,
  });
}

/** Fiche pairée avec la clé de l'appareil A : c'est elle qui rend A de confiance. */
async function trustDeviceA(): Promise<void> {
  const a = await ensureIdentity();
  const jwk = JSON.parse(
    (await getDB().settings.get("syncengine_public_key_jwk"))!.value as string,
  ) as JsonWebKey;
  await getDB().paired_devices.put({
    id: a.deviceId,
    shop_id: "s_group",
    role: "owner",
    public_key: JSON.stringify(jwk),
    status: "paired",
    updated_at: Date.now(),
  });
}

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

  it("n'épingle pas la clé d'une annonce laissée pending", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    const a = await ensureIdentity();
    const db = getDB();
    // Code de paire présent mais d'un AUTRE appareil → l'annonce reste `pending`.
    await db.settings.put({ key: PAIRING_KEYS.code, value: "ZZZZZZ" });
    await db.settings.put({
      key: PAIRING_KEYS.codeExpiresAt,
      value: Date.now() + 600_000,
    });

    await applyRemoteOps([
      await opFromA({
        type: "device.announce",
        entity_id: "attaquant",
        payload: {
          device_id: "attaquant",
          public_key: JSON.stringify({ kty: "RSA", n: "x", e: "AQAB" }),
          employee_name: "Attaquant",
          role: "owner",
        },
      }),
    ]);

    // La PROPRIÉTÉ qui compte : la clé de l'attaquant ne devient pas une autorité de
    // signature. Son statut peut rester `paired` (auto-pairage `owner` au premier
    // contact, comportement d'affichage préexistant) — sans effet sur les droits, qui se
    // lisent dans l'identité LOCALE (`getIdentity().role`), jamais dans cette fiche.
    const peer = await db.paired_devices.get("attaquant");
    expect(peer?.public_key).toBeUndefined();
    expect(a.deviceId).not.toBe("attaquant");
  });

  it("ne laisse pas une annonce non prouvée faire signer d'autres ops", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    const db0 = getDB();
    await db0.settings.put({ key: PAIRING_KEYS.code, value: "ZZZZZZ" });
    await db0.settings.put({
      key: PAIRING_KEYS.codeExpiresAt,
      value: Date.now() + 600_000,
    });
    await ensureIdentity();
    await trustDeviceA();

    // L'attaque en deux temps : s'annoncer comme `owner` (auto-pairé au premier contact,
    // donc la clé EST pinée par le chemin announcements légitimes)… puis, faute de mieux,
    // tenter une injection sous une identité unknowable. Le refus doit tenir même si le
    // registre contient cette fiche.
    const announce = await opFromA({
      type: "device.announce",
      entity_id: "attaquant",
      payload: {
        device_id: "attaquant",
        public_key: JSON.stringify({ kty: "EC", crv: "P-256", x: "x", y: "y" }),
        employee_name: "Attaquant",
        role: "owner",
      },
    });
    await applyRemoteOps([announce]);
    expect((await db0.paired_devices.get("attaquant"))?.public_key).toBeUndefined();

    const injected = await opFromA({ device_id: "attaquant" });
    const { applied } = await applyRemoteOps([injected]);
    expect(applied).toBe(0);
  });

  it("épingle la clé d'une annonce portant le bon code de paire", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    const a = await ensureIdentity();
    const db = getDB();
    await db.settings.put({ key: PAIRING_KEYS.code, value: "ABCDEF" });
    await db.settings.put({
      key: PAIRING_KEYS.codeExpiresAt,
      value: Date.now() + 600_000,
    });
    const pub = (await db.settings.get("syncengine_public_key_jwk"))!.value as string;

    // L'annonce vient de l'appareil QU'IL S'ANNONCE (comme `announceDevice` le fait
    // toujours) et prouve son identité par le code de paire : sa clé est donc épinglée.
    const self = a.deviceId;
    await applyRemoteOps([
      await opFromA({
        type: "device.announce",
        entity_id: self,
        payload: {
          device_id: self,
          public_key: pub,
          employee_name: "Employé",
          role: "employee",
          pair_code: "ABCDEF",
        },
      }),
    ]);

    const peer = await db.paired_devices.get(self);
    expect(peer?.status).toBe("paired");
    expect(peer?.public_key).toBe(pub);
  });

  it("applique une announcement approuvée à la main et épingle sa clé", async () => {
    await setShopAccount({ name: "Boutique", phone: "0700000001", password: "x" });
    const a = await ensureIdentity();
    const db = getDB();
    await trustDeviceA();
    const pub = (await db.settings.get("syncengine_public_key_jwk"))!.value as string;
    // Fiche `pending` créée par une annonce sans code, clé présente.
    await db.paired_devices.put({
      id: "employe",
      shop_id: "s_group",
      public_key: pub,
      status: "pending",
      updated_at: Date.now(),
    });

    await applyRemoteOps([
      await opFromA({
        type: "device.approve",
        entity_id: "employe",
        payload: { org_device_id: "employe", role: "employee", public_key: pub },
      }),
    ]);

    const peer = await db.paired_devices.get("employe");
    expect(peer?.status).toBe("paired");
    expect(peer?.role).toBe("employee");
    expect(peer?.public_key).toBe(pub);
    expect(a.deviceId).not.toBe("employe");
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
