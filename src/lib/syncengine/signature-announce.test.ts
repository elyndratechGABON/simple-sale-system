// Épinglage de clé au fil des ANNONCES de paire : une annonce non prouvée ne doit pas
// devenir une autorité de signature. Même frontière que `signature.test.ts`, mais côté
// cycle de vie des fiches `paired_devices` (pending / code de paire / approbation).
import { describe, it, expect } from "vitest";
import { getDB, setShopAccount } from "../db";
import { applyRemoteOps } from "./apply";
import { ensureIdentity } from "./identity";
import { opFromA, trustDeviceA } from "./signature-helpers";
import { PAIRING_KEYS } from "./types";

describe("signature des opérations — annonces de paire", () => {
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
});
