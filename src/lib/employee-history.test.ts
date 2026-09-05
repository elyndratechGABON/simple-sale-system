// Tests du carnet d'expérience employé : ouverture au join, fermeture à la suppression,
// survie aux purges (`purgeAllData` + `resetDeviceIdentity`).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addEmployeeHistory,
  closeEmployeeHistory,
  listEmployeeHistory,
  purgeAllData,
  resetDBForTests,
  setShopAccount,
} from "@/lib/db";
import {
  ensureIdentity,
  resetDeviceIdentity,
  resetIdentityForTests,
} from "@/lib/syncengine/identity";

const ACCOUNT = { name: "B Coiffure", phone: "+24100000002", password: "secret" };

describe("carnet d'expérience employé", () => {
  beforeEach(async () => {
    await resetDBForTests();
    resetIdentityForTests();
    await setShopAccount(ACCOUNT);
  });

  afterEach(async () => {
    await resetDBForTests();
    resetIdentityForTests();
  });

  it("opens an entry at join and closes it on deletion", async () => {
    const identity = await ensureIdentity();
    await addEmployeeHistory({
      employeeId: "emp-1",
      deviceId: identity.deviceId,
      shopId: identity.shopId,
      storeName: "Salon Précieux",
      cluster: "service",
    });

    const open = await listEmployeeHistory("emp-1");
    expect(open).toHaveLength(1);
    expect(open[0].endedAt).toBeUndefined();
    expect(open[0].cluster).toBe("service");
    expect(open[0].durationDays).toBe(0);

    await closeEmployeeHistory(identity.shopId);
    const closed = await listEmployeeHistory("emp-1");
    expect(closed).toHaveLength(1);
    expect(closed[0].endedAt).toBeDefined();
    expect(closed[0].durationDays).toBeGreaterThanOrEqual(1);
  });

  it("closes only the open entry for the given shop", async () => {
    const identity = await ensureIdentity();
    await addEmployeeHistory({
      employeeId: "emp-1",
      deviceId: identity.deviceId,
      shopId: identity.shopId,
      storeName: "Salon A",
      cluster: "service",
    });
    await addEmployeeHistory({
      employeeId: "emp-1",
      deviceId: identity.deviceId,
      shopId: "s_other",
      storeName: "Boucherie B",
      cluster: "weight",
    });

    await closeEmployeeHistory(identity.shopId);
    const rows = await listEmployeeHistory("emp-1");
    const salon = rows.find((r) => r.shopId === identity.shopId);
    const boucherie = rows.find((r) => r.shopId === "s_other");
    expect(salon?.endedAt).toBeDefined();
    expect(boucherie?.endedAt).toBeUndefined();
  });

  it("scopes the carnet per employeeId", async () => {
    const identity = await ensureIdentity();
    await addEmployeeHistory({
      employeeId: "emp-1",
      deviceId: identity.deviceId,
      shopId: identity.shopId,
      storeName: "Salon A",
      cluster: "service",
    });
    await addEmployeeHistory({
      employeeId: "emp-2",
      deviceId: identity.deviceId,
      shopId: identity.shopId,
      storeName: "Salon A",
      cluster: "service",
    });
    expect(await listEmployeeHistory("emp-1")).toHaveLength(1);
    expect(await listEmployeeHistory("emp-2")).toHaveLength(1);
  });

  it("survives purgeAllData + resetDeviceIdentity (compte supprimé)", async () => {
    const identity = await ensureIdentity();
    await addEmployeeHistory({
      employeeId: "emp-1",
      deviceId: identity.deviceId,
      shopId: identity.shopId,
      storeName: "Salon Précieux",
      cluster: "service",
    });

    await purgeAllData();
    await resetDeviceIdentity();

    const rows = await listEmployeeHistory("emp-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].storeName).toBe("Salon Précieux");
  });
});
