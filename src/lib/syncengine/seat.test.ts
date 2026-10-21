// La PLACE d'un écran qui part doit être rendue à l'orchestrateur : le quota compte
// les écrans du compte, et sans libération un commerce qui a eu un employé ne peut
// plus en recrouver un autre, même après son départ.
//
// Deux voies, une route : l'écran qui part (démission) et le propriétaire (quand il
// reçoit l'op de départ).
import { describe, it, expect, vi, afterEach } from "vitest";
import { getDB, setShopAccount } from "../db";
import { ensureIdentity, getDeviceKeys, setIdentityRole } from "./identity";
import { signAll } from "./ops";
import { exchangeOps } from "./transport";
import type { SyncOp } from "./types";
import { ACCOUNT, freshDevice, makeRelay } from "./pairing-helpers";

const APPELS: { url: string; body: Record<string, unknown> }[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  APPELS.length = 0;
});

/** Intercepte l'appel réseau de l'orchestrateur (la libération de place). */
function intercepterOrchestrateur() {
  vi.stubEnv("VITE_ORCHESTRATOR_URL", "https://orchestrateur.test");
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    APPELS.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("libération de place", () => {
  it("le propriétaire rend la place de l'écran qui part", async () => {
    intercepterOrchestrateur();
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("owner");
    const shopId = (await ensureIdentity()).shopId;
    const relay = makeRelay();

    // L'écran qui part est déjà au registre : sa clé est épinglée, ses ops se
    // vérifient. L'op de départ est signée par la clé du départant.
    await getDB().paired_devices.put({
      id: "employe-partant",
      shop_id: shopId,
      role: "employee",
      status: "paired",
      public_key: getDeviceKeys().publicKey,
      updated_at: Date.now(),
    });
    const [leaveOp] = await signAll([
      {
        id: "leave:1",
        shop_id: shopId,
        device_id: "employe-partant",
        seq: 1,
        type: "device.leave",
        entity_id: "employe-partant",
        payload: { org_device_id: "employe-partant", server_device_id: "srv-partant" },
        created_at: Date.now(),
        status: "pending",
      } as SyncOp,
    ]);
    await relay.client.push(shopId, [leaveOp]);

    await exchangeOps(relay.client);

    const appel = APPELS.find((a) => a.url.endsWith("/api/v1/devices/release"));
    expect(appel).toBeDefined();
    // L'identifiant de l'écran CHEZ LE SERVEUR : c'est lui que le serveur décompte.
    expect(appel!.body.device_id).toBe("srv-partant");
  });

  it("une op de départ déjà consommée ne redemande pas la place", async () => {
    intercepterOrchestrateur();
    await freshDevice();
    await setShopAccount(ACCOUNT);
    await ensureIdentity();
    await setIdentityRole("owner");
    const shopId = (await ensureIdentity()).shopId;
    const relay = makeRelay();

    await getDB().paired_devices.put({
      id: "employe-partant",
      shop_id: shopId,
      role: "employee",
      status: "paired",
      public_key: getDeviceKeys().publicKey,
      updated_at: Date.now(),
    });
    const [leaveOp] = await signAll([
      {
        id: "leave:2",
        shop_id: shopId,
        device_id: "employe-partant",
        seq: 1,
        type: "device.leave",
        entity_id: "employe-partant",
        payload: { org_device_id: "employe-partant", server_device_id: "srv-partant" },
        created_at: Date.now(),
        status: "pending",
      } as SyncOp,
    ]);
    await relay.client.push(shopId, [leaveOp]);

    await exchangeOps(relay.client);
    const premier = APPELS.filter((a) => a.url.endsWith("/api/v1/devices/release")).length;
    expect(premier).toBe(1);

    // Cycle suivant : l'op est déjà consommée (`processed_ops`) — on ne redemande rien.
    await exchangeOps(relay.client);
    expect(APPELS.filter((a) => a.url.endsWith("/api/v1/devices/release")).length).toBe(1);
  });
});
