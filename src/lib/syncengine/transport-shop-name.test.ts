// Le snapshot porte aussi le nom de la boutique : un nouvel écran resté sur le fallback
// « Ma boutique » adopte le nom transporté par le relais.
import { describe, it, expect } from "vitest";
import { ensureShopProfile, setShopAccount } from "../db";
import { ensureIdentity, getIdentity } from "./identity";
import { exchangeOps } from "./transport";
import { ACCOUNT, announceOpFor, freshDevice, makeRelay } from "./transport-helpers";

describe("transport P2P via relais", () => {
  it("le snapshot porte le nom de la boutique au nouvel écran resté sur « Ma boutique »", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    const id = getIdentity();
    const relay = makeRelay();

    const snapOp = await relay.asPeer({
      id: "snap:shop",
      device_id: "proprietaire",
      payload: {
        products: [],
        shop: { storeName: "Boutique Du Marché" },
      },
      status: "synced",
    });
    await relay.client.push(id.shopId, [await announceOpFor("proprietaire"), snapOp]);

    await exchangeOps(relay.client);
    // L'écran local est encore sur le fallback « Ma boutique » → il adopte le nom du relais.
    const profile = await ensureShopProfile("");
    expect(profile.storeName).toBe("Boutique Du Marché");
  });
});
