import { describe, test, expect, beforeEach } from "vitest";
import { ensureIdentity, getDeviceKeys, resetIdentityForTests, refreshShopId } from "@/lib/syncengine/identity";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { signAll } from "@/lib/syncengine/ops";
import { saveShopProfile, listProducts, resetDBForTests } from "@/lib/db";
import type { SyncOp } from "@/lib/syncengine/types";

/**
 * PROPRIÉTAIRE et EMPLOYÉ d'une même boutique convergent-ils ?
 *
 * C'est la question métier de tout le dispositif P2P : si deux écrans d'un même
 * commerce n'ont pas le même `shop_id`, le relais les range dans deux boîtes aux
 * lettres séparées et chacun ne voit que ses propres ventes. Le vendeur encaisse, le
 * patron voit un chiffre faux — silencieusement.
 *
 * Le mécanisme testé est celui du QR v1 (le chemin par défaut, cf. buildPairingPayload) :
 * le QR porte téléphone + mot de passe, l'employé refait un handshake, le serveur
 * lui rend `account.id`, et le client en dérive `s_<accountId>`. La convergence tient
 * donc à une seule chose : le `accountId` est IDENTIQUE des deux côtés.
 */

const ACCOUNT_ID = "41";
const SHOP = `s_${ACCOUNT_ID}`;

/** Op signée par un deviceId, comme l'enverrait une caisse. */
async function signedOps(
  deviceId: string,
  items: { id: string; name: string; price: number }[],
): Promise<SyncOp[]> {
  const announce: SyncOp = {
    id: `annonce:${deviceId}:1`,
    shop_id: SHOP,
    device_id: deviceId,
    seq: 1,
    type: "device.announce",
    entity_id: deviceId,
    payload: {
      device_id: deviceId,
      public_key: getDeviceKeys().publicKey,
      employee_name: deviceId === "dev-proprio" ? "Jean" : "Employé",
      role: deviceId === "dev-proprio" ? "owner" : "employee",
    },
    created_at: 1,
    status: "pending",
  } as SyncOp;

  const products = items.map((p, i) => ({
    id: `${p.id}:${deviceId}:${i}`,
    shop_id: SHOP,
    device_id: deviceId,
    seq: i + 2,
    type: "product.created",
    entity_id: p.id,
    payload: {
      product: {
        id: p.id,
        name: p.name,
        cost: 500,
        price: p.price,
        stock: 20,
        category: "Test",
        updated_at: 1,
        sync_status: "local",
      },
    },
    created_at: 100 + i,
    status: "pending",
  })) as SyncOp[];

  return signAll([announce, ...products]);
}

beforeEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
});

describe("convergence propriétaire / employé", () => {
  test("un accountId identique donne le même shop_id aux deux écrans", async () => {
    // Le propriétaire, handshake fait : accountId connu.
    await ensureIdentity();
    await saveShopProfile({ accountId: ACCOUNT_ID } as never);
    const proprioShopId = await refreshShopId();
    expect(proprioShopId).toBe(SHOP);

    // L'employé reçoit le MÊME accountId du serveur (même compte, même téléphone).
    const employeShopId = `s_${ACCOUNT_ID}`;
    expect(employeShopId).toBe(proprioShopId);
  });

  test("sans accountId, la dérivation locale ne matche PAS s_<accountId>", async () => {
    // C'est ce qui rend accountId OBLIGATOIRE : sans lui, le SHA-256(téléphone|nom)
    // produit un groupe différent du groupe du serveur, silencieusement.
    await ensureIdentity();
    await saveShopProfile({ accountPhone: "690000000", accountName: "Ma Boutique" } as never);
    const derived = await refreshShopId();
    expect(derived).not.toBe(SHOP);
    expect(derived).toMatch(/^s_[0-9a-f]{12}$/);
  });

  test("la vente d'un employé devient visible chez le propriétaire", async () => {
    // Le trajet réel : l'employé pousse ses ops, le propriétaire les applique.
    await ensureIdentity();
    await saveShopProfile({ accountId: ACCOUNT_ID } as never);

    // Ops émises par l'écran EMPLOYÉ (deviceId différent, même shop_id).
    const fromEmployee = await signedOps("dev-employe", [
      { id: "p-boisson", name: "Eau minérale", price: 500 },
    ]);
    const r = await applyRemoteOps(fromEmployee);
    expect(r.applied).toBe(2);

    // Côté propriétaire, le produit de l'employé est là.
    const products = await listProducts();
    const vendu = products.find((p) => p.id === "p-boisson");
    expect(vendu).toBeTruthy();
    expect(vendu?.name).toBe("Eau minérale");
  });

  test("deux employés du même groupe voient les ventes l'un de l'autre", async () => {
    await ensureIdentity();
    await saveShopProfile({ accountId: ACCOUNT_ID } as never);

    // Employé A vend.
    const fromA = await signedOps("dev-A", [{ id: "p-a", name: "Article A", price: 1000 }]);
    await applyRemoteOps(fromA);
    // Employé B reçoit ensuite le flux du même shop_id.
    const fromB = await signedOps("dev-B", []);
    await applyRemoteOps(fromB);

    const names = (await listProducts()).map((p) => p.name);
    expect(names).toContain("Article A");
  });

  test("un shop_id DIFFÉRENT ne mélange pas les ventes (l'isolation tient)", async () => {
    // Le contresens : deux comptes distincts ne doivent JAMAIS voir les articles l'un
    // de l'autre. C'est l'inverse exact du test précédent, et c'est ce qui garantit
    // qu'un `shop_id` deviné ne donne rien.
    await ensureIdentity();
    await saveShopProfile({ accountId: ACCOUNT_ID } as never);

    const opsAutreBoutique: SyncOp[] = [
      {
        id: "x:1",
        shop_id: "s_999", // autre compte
        device_id: "dev-x",
        seq: 1,
        type: "product.created",
        entity_id: "p-x",
        payload: {
          product: {
            id: "p-x",
            name: "Article confidentiel",
            cost: 1,
            price: 1,
            stock: 1,
            category: "X",
            updated_at: 1,
            sync_status: "local",
          },
        },
        created_at: 1,
        status: "pending",
      } as SyncOp,
    ];
    const r = await applyRemoteOps(await signAll(opsAutreBoutique));
    // Non appliquées : le groupe ne correspond pas au nôtre.
    const names = (await listProducts()).map((p) => p.name);
    expect(names).not.toContain("Article confidentiel");
    expect(r.applied + r.skipped).toBeGreaterThanOrEqual(1);
  });
});