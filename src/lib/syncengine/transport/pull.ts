// Pull des ops distantes + filtrage/routing des ops entrantes.

import type {
  SyncRepository,
  TransportClient,
  SyncIdentity,
  SyncOp,
  PairedDevice,
  CatalogueRequestPayload,
  DeviceApprovePayload,
} from "./types";
import { getDB } from "../../db";
import { applyRemoteOps } from "../apply";
import { pairedEmployees } from "../sharing";
import { addCatalogueRequest } from "../../db";
import { expireOldCatalogueRequests } from "../../db";
import { listPendingCatalogueRequests } from "../../db";
import { markCatalogueRequestSnapshotSent } from "../../db";

interface PullResult {
  foreign: SyncOp[];
  applied: number;
  skipped: number;
  remote: number;
  freshApproves: string[];
  fresh: SyncOp[];
  newcomerAnnounced: boolean;
}

/** Tire les ops du relais, filtre les siennes, applique les étrangères. */
export async function pullAndApply(
  client: TransportClient,
  identity: SyncIdentity,
  repo: SyncRepository,
): Promise<PullResult> {
  const remote = await client.pull(identity.shopId, identity.deviceId);
  const foreign: SyncOp[] = [];
  let skipped = 0;

  // Know which devices are already paired BEFORE processing announces
  const knownBefore = new Set(
    (await repo.getPairedDevicesByShop(identity.shopId)).map((d: PairedDevice) => d.id),
  );
  let newcomerAnnounced = false;

  for (const op of remote) {
    if (op.device_id === identity.deviceId) {
      skipped++;
      continue;
    }
    // Une approbation qui NOUS vise ne crée pas de fiche de soi-même : seul le registre
    // des pairs est concerné par cette décision, et il ne s'y enregistre pas lui-même.
    if (op.type === "device.approve" && op.entity_id === identity.deviceId) {
      skipped++;
      continue;
    }
    // Une annonce N'EST PAS interceptée ici : elle part dans `foreign` comme les
    // autres ops, et `applyOp` la traite. Intercepter ici (ancien
    // `handleDeviceAnnounce`, supprimé) créait un second chemin de décision, et surtout une
    // annonce consommée localement n'arrivait jamais à `applyRemoteOps` — donc la clé
    // publique du pair n'était jamais PINsée, et toutes ses ops suivantes se
    // faisaient refuser. Une seule porte : `applyOp`.
    if (op.type === "device.announce" && !knownBefore.has(op.entity_id)) {
      newcomerAnnounced = true;
    }
    foreign.push(op);
  }

  const { applied } = await applyRemoteOps(foreign);

  // Import « stock du propriétaire » demandé par un écran du groupe : le membre principal
  // répond avec LE sous-catalogue choisi pour cet écran (`shared_product_ids` /
  // `share_mode` de sa fiche), jamais avec le catalogue entier. On ne répond qu'aux
  // demandes PAS ENCORE consommées (`processed_ops`) : `foreign` contient toutes les ops
  // du relais, y compris celles rejouées aux cycles précédents.
  //
  // `requester_id` est la clé : c'est lui qui dit à qui on parle. Plusieurs employés
  // peuvent demander au même cycle — chacun reçoit le sien.
  const demandes = foreign.filter((op) => op.type === "catalogue.request");
  const dejaVues = await Promise.all(demandes.map((op) => repo.getProcessedOp(op.id)));
  const fresh = demandes.filter((_, i) => !dejaVues[i]);

  // Ops d'approbation fraîchement appliquées : l'appareil vient d'être promu "paired"
  // et doit recevoir son stock IMMÉDIATEMENT, sans attendre le throttle des snapshots.
  const approveOps = foreign.filter((op) => op.type === "device.approve");
  const freshApproves: string[] = [];
  for (const op of approveOps) {
    if (!(await repo.getProcessedOp(op.id))) {
      freshApproves.push((op.payload as DeviceApprovePayload).org_device_id);
    }
  }

  return {
    foreign,
    applied,
    skipped,
    remote: remote.length,
    freshApproves,
    fresh,
    newcomerAnnounced,
  };
}

/** Traite la logique post-pull côté owner (snapshots, demandes import, etc.). */
export async function handleOwnerPostPull(
  identity: SyncIdentity,
  fresh: SyncOp[],
  freshApproves: string[],
  newcomerAnnounced: boolean,
  repo: SyncRepository,
  pairedEmployees: (shopId: string) => Promise<PairedDevice[]>,
  emitShareOps: (
    peer: PairedDevice,
    opts?: { force?: boolean },
  ) => Promise<{ signature: string; count: number; at: number } | null>,
  addCatalogueRequest: (args: {
    id: string;
    shop_id: string;
    requester_id: string;
    created_at: number;
  }) => Promise<void>,
): Promise<string[]> {
  const peers = await pairedEmployees(identity.shopId);
  const cibles: string[] = [];

  for (const demande of fresh) {
    const id = (demande.payload as CatalogueRequestPayload)?.requester_id;
    if (id && !cibles.includes(id)) cibles.push(id);
  }
  if (newcomerAnnounced) {
    for (const peer of peers) if (!cibles.includes(peer.id)) cibles.push(peer.id);
  }
  // Appareils fraîchement approuvés : envoi IMMÉDIAT du snapshot (hors throttle).
  for (const deviceId of freshApproves) {
    const peer = peers.find((p: PairedDevice) => p.id === deviceId);
    if (peer) await emitShareOps(peer);
  }
  // Demandes d'import fraîches : on les enregistre en attente de confirmation du propriétaire.
  for (const deviceId of cibles) {
    const demande = fresh.find(
      (d: SyncOp) => (d.payload as CatalogueRequestPayload).requester_id === deviceId,
    );
    if (demande) {
      await addCatalogueRequest({
        id: demande.id,
        shop_id: identity.shopId,
        requester_id: deviceId,
        created_at: Date.now(),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("catalogue-request-pending", {
            detail: { requester_id: deviceId, shop_id: identity.shopId },
          }),
        );
      }
    }
  }

  return cibles;
}

/** Traite la logique post-pull côté employee (push immédiat snapshots). */
export async function handleEmployeePostPull(
  identity: SyncIdentity,
  freshApproves: string[],
  cibles: string[],
  repo: SyncRepository,
  client: TransportClient,
  listPendingOps: (shopId: string) => Promise<SyncOp[]>,
  signAll: (ops: SyncOp[]) => Promise<SyncOp[]>,
  markOpsSynced: (opIds: string[]) => Promise<void>,
  emitShareOps: (
    peer: PairedDevice,
    opts?: { force?: boolean },
  ) => Promise<{ signature: string; count: number; at: number } | null>,
  pairedEmployees: (shopId: string) => Promise<PairedDevice[]>,
  SNAPSHOT_THROTTLE_MS: number,
  KEY_LAST_SNAPSHOT: string,
): Promise<void> {
  // Les snapshots pour les nouveaux approuvés (device.approve) viennent d'être écrits
  // dans l'outbox : on les pousse TOUT DE SUITE.
  if (freshApproves.length > 0) {
    const pendingNow = await listPendingOps(identity.shopId);
    if (pendingNow.length > 0) {
      const signed = await signAll(pendingNow);
      await client.push(identity.shopId, signed);
      await markOpsSynced(pendingNow.map((o: SyncOp) => o.id));
    }
  }
  const last = Number((await repo.getSettings(KEY_LAST_SNAPSHOT))?.value ?? 0);
  if (cibles.length > 0 && Date.now() - last >= SNAPSHOT_THROTTLE_MS) {
    const peers = await pairedEmployees(identity.shopId);
    for (const cible of cibles) {
      const peer = peers.find((p: PairedDevice) => p.id === cible);
      if (!peer) continue;
      await emitShareOps(peer);
    }
    await repo.putSettings(KEY_LAST_SNAPSHOT, Date.now());
  }
}

/** Envoie les snapshots pour les demandes d'import confirmées. */
export async function handleConfirmedCatalogueRequests(
  identity: SyncIdentity,
  repo: SyncRepository,
  pairedEmployees: (shopId: string) => Promise<PairedDevice[]>,
  emitShareOps: (
    peer: PairedDevice,
    opts?: { force?: boolean },
  ) => Promise<{ signature: string; count: number; at: number } | null>,
  listPendingCatalogueRequests: (
    shopId: string,
  ) => Promise<Array<{ id: string; status: string; snapshot_sent: boolean; requester_id: string }>>,
  markCatalogueRequestSnapshotSent: (id: string) => Promise<void>,
): Promise<void> {
  const peers = await pairedEmployees(identity.shopId);
  const confirmedRequests = await listPendingCatalogueRequests(identity.shopId);
  const confirmed = confirmedRequests.filter(
    (r: { status: string; snapshot_sent: boolean }) => r.status === "confirmed" && !r.snapshot_sent,
  );
  for (const req of confirmed) {
    const peer = peers.find((p: PairedDevice) => p.id === req.requester_id);
    if (peer) {
      await emitShareOps(peer);
      await markCatalogueRequestSnapshotSent(req.id);
    }
  }
}
