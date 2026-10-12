// Orchestration complète d'un cycle d'échange (push + pull + apply + post-traitements).

import { syncSemaphore } from "../semaphore";
import { getIdentity, isSharedGroup } from "../identity";
import { pairedEmployees, emitShareOps, markSharePublished } from "../sharing";
import { listPendingOps, markOpsSynced } from "../outbox";
import { signAll } from "../ops";
import {
  addCatalogueRequest,
  listPendingCatalogueRequests,
  markCatalogueRequestSnapshotSent,
} from "../../db";
import type { TransportClient, SyncState, SyncIdentity } from "./types";
import { makeSyncRepository } from "./repository";
import { pushLocalOps } from "./push";
import {
  pullAndApply,
  handleOwnerPostPull,
  handleEmployeePostPull,
  handleConfirmedCatalogueRequests,
} from "./pull";
import { publishFreshCatalog } from "./catalog";
import { SNAPSHOT_THROTTLE_MS, KEY_LAST_SNAPSHOT } from "./types";

/** Cycle complet d'un appareil : pousse son outbox, tire ce que les autres ont laissé,
 *  rejoue les ops étrangères. Jamais bloquant : tout est déjà protégé en amont. */
export async function exchangeOps(client: TransportClient): Promise<SyncState> {
  const release = await syncSemaphore.acquire();
  try {
    // Injection de dépendances — repo créé une seule fois
    const repo = makeSyncRepository();
    const identity = getIdentity();
    if (!isSharedGroup(identity.shopId)) {
      return { pushed: 0, applied: 0, skipped: 0, remote: 0 };
    }

    // Check if this device is paired (not pending) - skip sync if still pending
    const self = await repo.getPairedDevice(identity.deviceId);
    if (self?.status === "pending") {
      console.warn(`[exchangeOps] Device ${identity.deviceId} is pending, skipping exchange`);
      return { pushed: 0, applied: 0, skipped: 0, remote: 0 };
    }

    // 1. PUSH local outbox
    const pushed = await pushLocalOps(client, identity, repo);

    // 2. PULL + APPLY remote ops
    const { applied, skipped, remote, freshApproves, fresh, newcomerAnnounced } =
      await pullAndApply(client, identity, repo);

    // 3. POST-PULL selon le rôle
    let cibles: string[] = [];
    if (identity.role !== "employee") {
      cibles = await handleOwnerPostPull(
        identity,
        fresh,
        freshApproves,
        newcomerAnnounced,
        repo,
        pairedEmployees,
        emitShareOps,
        addCatalogueRequest,
      );
    } else {
      await handleEmployeePostPull(
        identity,
        freshApproves,
        cibles,
        repo,
        client,
        listPendingOps,
        signAll,
        markOpsSynced,
        emitShareOps,
        pairedEmployees,
        SNAPSHOT_THROTTLE_MS,
        KEY_LAST_SNAPSHOT,
      );
    }

    // 4. Demandes d'import confirmées par le propriétaire
    await handleConfirmedCatalogueRequests(
      identity,
      repo,
      pairedEmployees,
      emitShareOps,
      listPendingCatalogueRequests,
      markCatalogueRequestSnapshotSent,
    );

    // 5. Publication continue du catalogue (owner only)
    await publishFreshCatalog(
      client,
      identity,
      repo,
      emitShareOps,
      markSharePublished,
      pairedEmployees,
      listPendingOps,
      signAll,
      markOpsSynced,
    );

    return { pushed, applied, skipped, remote };
  } finally {
    release();
  }
}
