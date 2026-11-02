import { describe, expect, it } from "vitest";
import "./syncengine/__tests__/setup";
import { getDB } from "./db";
import { savePairingOwnerKey } from "./pairing/apply";
import { parsePairingPayload } from "./pairing/build";

describe("parsePairingPayload owner trust material", () => {
  it("lit l'identifiant et la clé publique du patron dans le QR share v2", () => {
    const parsed = parsePairingPayload(
      JSON.stringify({
        v: 2,
        app: "ecaisse",
        url: "https://orchestrator.test",
        token: "share-token-123456",
        name: "Vegapunk",
        account_phone: "+24100000000",
        pair_code: "ABC123",
        owner_device_id: "24333f1c-e121-4b83-bcd3-736c30e5e283",
        public_key: '{"kty":"EC","crv":"P-256"}',
      }),
    );

    expect(parsed?.owner_device_id).toBe("24333f1c-e121-4b83-bcd3-736c30e5e283");
    expect(parsed?.public_key).toBe('{"kty":"EC","crv":"P-256"}');
  });

  it("épingle la clé publique du patron dans paired_devices après le scan", async () => {
    const saved = await savePairingOwnerKey(
      "s_shop",
      "24333f1c-e121-4b83-bcd3-736c30e5e283",
      '{"kty":"EC","crv":"P-256"}',
    );

    expect(saved).toBe(true);
    const owner = await getDB().paired_devices.get("24333f1c-e121-4b83-bcd3-736c30e5e283");
    expect(owner).toMatchObject({
      shop_id: "s_shop",
      role: "owner",
      public_key: '{"kty":"EC","crv":"P-256"}',
      status: "paired",
    });
  });
});
