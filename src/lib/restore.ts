/**
 * Récupération d'une boutique depuis l'archive de l'orchestrateur.
 *
 * Contexte : le relais est une boîte aux lettres PURGEABLE — passé le délai de
 * fraîcheur, ce qui n'a pas été tiré disparaît. L'archive `sync_ops` de l'orchestrateur
 * est donc la seule copie qui survit à la perte d'un téléphone. Ce module va la chercher.
 *
 * Le téléphone ne S'INVENTE pas d'accès : il s'authentifie au handshake (compte +
 * mot de passe), en tire son `accountId`, et c'est ce qui détermine le `shopId`
 * (cf. `deriveShopId` dans identity.ts). Sans le serveur joignable il n'a même pas son
 * `shopId` — d'où le fait que le lancement de l'orchestrateur soit un PRÉALABLE, pas une
 * commodité. Le message d'erreur le dit explicitement plutôt que d'annoncer un vide.
 *
 * Le rejeu passe par `applyRemoteOps`, exactement comme le canal P2P : même
 * vérification de signature, même déduplication par `processed_ops`. Une archive
 * rejouée deux fois ne duplique donc rien, ce qui rend la reprise de page sans risque.
 */

import { applyRemoteOps } from "@/lib/syncengine/apply";
import { getIdentity, refreshShopId } from "@/lib/syncengine/identity";
import { getOrchestratorUrl } from "@/lib/sync";
import { getDB } from "@/lib/db";
import type { SyncOp } from "@/lib/syncengine/types";

/** Statuts que connaît l'orchestrateur pour un job de restauration. */
export type RestoreJobStatus = "pending" | "ready";

export interface RestoreRequestResult {
  job_id: string;
  status: RestoreJobStatus;
  total_ops: number;
  /** Message actionnable : dit COMMENT débloquer, pas seulement qu'il n'y a rien. */
  message: string;
}

export interface RestoreProgress {
  applied: number;
  skipped: number;
  cursor: number;
  total: number;
  done: boolean;
}

const REQ_TIMEOUT_MS = 15_000;
const KEY_RESTORE_JOB = "restore_job_id";

async function orchestratorPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getOrchestratorUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => null)) ?? {};
  if (!res.ok) {
    // Le serveur dit pourquoi (503 « BACKUP_KEY absent », 403 « pas membre »…) : le
    // remonter tel quel évite un « échec » opaque côté utilisateur.
    const err = new Error(
      typeof data?.error === "string" ? data.error : `Serveur HTTP ${res.status}`,
    ) as Error & { code?: string };
    err.code = typeof data?.code === "string" ? data.code : undefined;
    throw err;
  }
  return data as T;
}

/**
 * Demande (ou relance) une restauration. L'`identity` doit être à jour : c'est
 * `ensureIdentity()` qui a résolu le compte auprès du serveur.
 *
 * @throws si l'orchestrateur est injoignable — cas NORMAL et attendu, puisque le
 *         service doit être lancé à la main. Le message d'erreur est donc formulé
 *         pour être affiché tel quel.
 */
export async function requestRestore(): Promise<RestoreRequestResult> {
  const identity = await ensureRestoreIdentity();
  return orchestratorPost<RestoreRequestResult>("/api/v1/restore", {
    device_id: identity.deviceId,
    shop_id: identity.shopId,
  });
}

/**
 * Consomme l'archive page par page jusqu'au bout. Chaque page est appliquée avant la
 * suivante : si le téléphone s'interrompt au milieu, la reprise repart de la page
 * atteinte et `processed_ops` fait le reste.
 *
 * Le job reste REJOUABLE côté serveur : le rappeler ne détruit rien.
 */
export async function consumeRestore(
  jobId: string,
  onProgress?: (p: RestoreProgress) => void,
): Promise<RestoreProgress> {
  const identity = await ensureRestoreIdentity();
  let cursor = 0;
  let applied = 0;
  let skipped = 0;
  let total = 0;

  // Garde-fou : une archive qui ne se termine pas bornerait une boucle infinie sur le
  // réseau. `has_more` est la condition d'arrêt normale ; ce compteur attrape le cas d'un
  // serveur qui répond toujours `has_more: true` sans avancer.
  let rounds = 0;
  const MAX_ROUNDS = 2000;

  while (rounds++ < MAX_ROUNDS) {
    const url =
      `${getOrchestratorUrl()}/api/v1/restore/${encodeURIComponent(jobId)}` +
      `?device_id=${encodeURIComponent(identity.deviceId)}` +
      `&shop_id=${encodeURIComponent(identity.shopId)}&cursor=${cursor}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(REQ_TIMEOUT_MS) });
    const data = (await res.json().catch(() => null)) ?? {};
    if (!res.ok) {
      const err = new Error(
        typeof data?.error === "string" ? data.error : `Serveur HTTP ${res.status}`,
      ) as Error & { code?: string };
      err.code = typeof data?.code === "string" ? data.code : undefined;
      throw err;
    }

    const ops = (Array.isArray(data.ops) ? data.ops : []) as SyncOp[];
    total = Number(data.total_ops ?? total);

    if (ops.length > 0) {
      // Même chemin que le canal P2P : signatures vérifiées, `processed_ops` déduplique.
      const r = await applyRemoteOps(ops);
      applied += r.applied;
      skipped += r.skipped;
    }

    cursor = Number(data.cursor ?? cursor + ops.length);
    const hasMore = data.has_more === true;
    onProgress?.({ applied, skipped, cursor, total, done: !hasMore });
    if (!hasMore) return { applied, skipped, cursor, total, done: true };
    if (ops.length === 0) {
      // Le serveur dit « il reste » mais ne rend rien : inutile d'insister, la page
      // suivante serait identique.
      return { applied, skipped, cursor, total, done: false };
    }
  }

  return { applied, skipped, cursor, total, done: false };
}

/** Le job est mémorisé pour que l'UI survive à un rechargement de page. */
export async function rememberRestoreJob(jobId: string): Promise<void> {
  await getDB().settings.put({ key: KEY_RESTORE_JOB, value: jobId });
}

export async function recallRestoreJob(): Promise<string | null> {
  const row = await getDB().settings.get(KEY_RESTORE_JOB);
  return typeof row?.value === "string" ? row.value : null;
}

export async function forgetRestoreJob(): Promise<void> {
  await getDB().settings.delete(KEY_RESTORE_JOB);
}

/**
 * L'identité doit exister ET le `shopId` doit être celui du compte (pas le `d_<device>`
 * d'une caisse isolée). Sans handshake effectué, `identity.shopId` est un identifiant local
 * que l'orchestrateur ne connaît pas : la demande partirait, et le serveur répondrait
 * « écran inconnu », ce qui se lirait comme une panne alors que c'est le service qui
 * n'est pas démarré.
 */
async function ensureRestoreIdentity(): Promise<{ deviceId: string; shopId: string }> {
  const identity = await getIdentity();
  // Le `shopId` peut avoir changé depuis la création du profil (compte renseigné après
  // coup) : on le recalcule avant de partir.
  const refreshed = (await refreshShopId()) ?? identity.shopId;
  if (!refreshed || refreshed.startsWith("d_")) {
    throw new Error(
      "Votre caisse n'est pas encore rattachée à un compte. Démarrez le service puis relancez la connexion.",
    );
  }
  return { deviceId: identity.deviceId, shopId: refreshed };
}