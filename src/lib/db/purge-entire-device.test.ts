import { describe, expect, it } from "vitest";
import "../syncengine/__tests__/setup";
import { QueryClient } from "@tanstack/react-query";
import { getDB, purgeEntireDevice } from "./index";
import { setQueryClient } from "../syncengine/queries";

describe("purgeEntireDevice", () => {
  it("supprime toute la base Dexie et vide le cache React Query et localStorage", async () => {
    const db = getDB();
    await db.settings.put({ key: "purge-test", value: "secret" });
    await db.products.put({
      id: "purge-product",
      name: "Photo fantôme",
      cost: 1,
      price: 2,
      stock: 1,
      category: "Boisson",
      updated_at: Date.now(),
      sync_status: "local",
      photo: "data:image/webp;base64,stale",
    });
    localStorage.setItem("purge-test", "secret");

    const queryClient = new QueryClient();
    queryClient.setQueryData(["purge-test"], { photo: "stale" });
    setQueryClient(queryClient);

    await purgeEntireDevice();

    expect(localStorage.length).toBe(0);
    expect(queryClient.getQueryData(["purge-test"])).toBeUndefined();
    const freshDb = getDB();
    expect(await freshDb.settings.count()).toBe(0);
    expect(await freshDb.products.count()).toBe(0);
  });
});
