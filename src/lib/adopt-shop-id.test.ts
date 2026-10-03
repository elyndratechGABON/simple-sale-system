import { describe, test, expect, beforeEach } from "vitest";
import {
  adoptShopIdFromRelay,
  clearAdoptedShopId,
  ensureIdentity,
  getIdentity,
  refreshShopId,
  resetIdentityForTests,
} from "@/lib/syncengine/identity";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { signAll } from "@/lib/syncengine/ops";
import { getDeviceKeys } from "@/lib/syncengine/identity";
import { saveShopProfile, listProducts, resetDBForTests } from "@/lib/db";
import type { SyncOp } from "@/lib/syncengine/types";

/**
 * L'employé atterrit-il dans le GROUPE du propriétaire, ou dans le sien ?
 *
 * Le risque est silencieux : `deriveShopId` dérive un groupe du téléphone, le relais en
 * connaît un autre. Les deux écrans escreivent alors dans deux boîtes aux lettres, et
 * personne ne voit d'erreur — le vendeur encaisse, le patron consulte un chiffre faux.
 *
 * Le correctif est `adoptShopIdFromRelay` : le `shop_id` que le relais inscrit dans
 * `share_tokens` fait autorité et n'est jamais recalculé.
 */

const PROPRIETAIRE_SHOP = "s_41";

beforeEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
});

describe("adoption du shop_id du relais", () => {
  test("le shop_id adopté prime sur la dérivation locale", async () => {
    await ensureIdentity();
    // Sans adoption, avec téléphone : groupe dérivé local.
    await saveShopProfile({ accountPhone: "690000000", accountName: "Ma Boutique" } as never);
    const derive = await refreshShopId();
    expect(derive).not.toBe(PROPRIETAIRE_SHOP);

    // Le relais impose le vrai groupe.
    await adoptShopIdFromRelay(PROPRIETAIRE_SHOP);
    expect(await refreshShopId()).toBe(PROPRIETAIRE_SHOP);
    expect(getIdentity().shopId).toBe(PROPRIETAIRE_SHOP);
  });

  test("l'adoption survit à un ensureIdentity() (n'est pas recalculée)", async () => {
    await ensureIdentity();
    await saveShopProfile({ accountPhone: "690000000", accountName: "Ma Boutique" } as never);
    await adoptShopIdFromRelay(PROPRIETAIRE_SHOP);
    resetIdentityForTests(); // simule un redémarrage : cache vidé
    await ensureIdentity();
    expect(getIdentity().shopId).toBe(PROPRIETAIRE_SHOP);
  });

  test("un shop_id de forme inattendue est refusé", async () => {
    await ensureIdentity();
    // Un `d_` est un groupe isolé : l'adopter casserait la convergence.
    expect(await adoptShopIdFromRelay("d_abc123")).toBeNull();
    // Un `shop_id` arbitraire qui ne ressemble à rien ne doit pas non plus être écrit.
    expect(await adoptShopIdFromRelay("../../etc/passwd")).toBeNull();
    expect(await adoptShopIdFromRelay("")).toBeNull();
  });

  test("clearAdoptedShopId rend la main à la dérivation", async () => {
    await ensureIdentity();
    await saveShopProfile({ accountPhone: "690000000", accountName: "Ma Boutique" } as never);
    const derive = await refreshShopId();
    await adoptShopIdFromRelay(PROPRIETAIRE_SHOP);
    expect(await refreshShopId()).toBe(PROPRIETAIRE_SHOP);

    await clearAdoptedShopId();
    expect(await refreshShopId()).toBe(derive);
  });

  test("la vente de l'employé adopted arrive chez le propriétaire du groupe", async () => {
    // Parcours complet : l'employé adopte le groupe, vend, le propriétaire voit l'article.
    await ensureIdentity();
    await saveShopProfile({ accountPhone: "690000000", accountName: "Ma Boutique" } as never);
    await adoptShopIdFromRelay(PROPRIETAIRE_SHOP);
    expect(getIdentity().shopId).toBe(PROPRIETAIRE_SHOP);

    const ops: SyncOp[] = [
      {
        id: "emp:1", shop_id: PROPRIETAIRE_SHOP, device_id: "dev-emp", seq: 1,
        type: "device.announce", entity_id: "dev-emp",
        payload: {
          device_id: "dev-emp",
          public_key: getDeviceKeys().publicKey,
          employee_name: " employe", role: "employee",
        },
        created_at: 1, status: "pending",
      } as SyncOp,
      {
        id: "emp:2", shop_id: PROPRIETAIRE_SHOP, device_id: "dev-emp", seq: 2,
        type: "product.created", entity_id: "p1",
        payload: {
          product: {
            id: "p1", name: "Eau", cost: 100, price: 500, stock: 24,
            category: "Boissons", updated_at: 1, sync_status: "local",
          },
        },
        created_at: 2, status: "pending",
      } as SyncOp,
    ];
    const r = await applyRemoteOps(await signAll(ops));
    expect(r.applied).toBe(2);
    const names = (await listProducts()).map((p) => p.name);
    expect(names).toContain("Eau");
  });
});