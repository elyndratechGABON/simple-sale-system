// La démission d'un écran employé : il quitte le groupe LUI-MÊME via une op signée
// `device.leave` (payload `org_device_id` = lui-même). Chez le propriétaire, la fiche du
// registre est EFFACÉE — jamais reconstruite par le tampon `last_seen` d'`orchestrate`
// (sinon, une fiche sans rôle réapparaîtrait, lue « Propriétaire »).
//
// Le lot capturé est l'outbox brute signée (annonce + départ), PAS `captureSigned` :
// celui-ci ré-émettrait une annonce APRÈS le départ (l'appareil qui repart de zéro se
// ré-annonce), ce qui recréerait la fiche et masquerait l'effet du départ.
import { describe, it, expect } from "vitest";
import { getDB, listProducts, resetDBForTests, setShopAccount } from "../db";
import { ensureIdentity, getDeviceKeys, resetIdentityForTests } from "./identity";
import { setCachedIdentity, setCachedKeys } from "./identity/state";
import { signAll } from "./ops";
import { listPendingOps } from "./outbox";
import { announceDevice, emitLeaveOp, generatePairingCode } from "./pairing";
import { listPairedDevices } from "./peers";
import { PAIRING_KEYS } from "./types";
import { applyRemoteOpsSigned } from "./__tests__/setup";
import { ACCOUNT, freshDevice } from "./sync-engine-helpers";

describe("démission — device.leave", () => {
  it("efface la fiche du partant chez le propriétaire ; le catalogue n'en bouge pas", async () => {
    // Écran propriétaire : son identité est mise de côté pour être reconstituée à
    // l'identique plus bas (même deviceId, mêmes clés) — cf. recharge.test.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idO = await ensureIdentity();
    const keysO = getDeviceKeys();
    const token = await generatePairingCode();

    // Écran employé B : il rejoint le groupe avec ce code, puis émet son départ.
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const idB = await ensureIdentity();
    void idB;
    await announceDevice(token);
    await emitLeaveOp();
    const bOps = await signAll(await listPendingOps(idB.shopId));
    expect(bOps.map((o) => o.type)).toEqual(["device.announce", "device.leave"]);

    // Retour chez le propriétaire : identité restaurée à l'identique, et le code de
    // paire est reposé tel quel — l'annonce de B est comparée à ce même jeton.
    await resetDBForTests();
    resetIdentityForTests();
    setCachedIdentity(idO);
    setCachedKeys(keysO);
    await getDB().settings.bulkPut([
      { key: PAIRING_KEYS.code, value: token },
      { key: PAIRING_KEYS.codeExpiresAt, value: Date.now() + 600_000 },
    ]);
    const { applied } = await applyRemoteOpsSigned(bOps);
    expect(applied).toBe(2);

    // L'annonce de B a bien épinglé la clé et passé B `paired` ; puis la démission,
    // appliquée APRÈS l'annonce (tri déterministe), a EFFACÉ la fiche :
    const leaveOp = bOps.find((o) => o.type === "device.leave");
    const registry = await listPairedDevices(idO.shopId);
    expect(leaveOp).toBeDefined();
    expect(registry.find((d) => d.id === leaveOp!.device_id)).toBeUndefined();
    // Le départ ne touche AUCUNE donnée métier.
    expect(await listProducts()).toHaveLength(0);
  });
});
