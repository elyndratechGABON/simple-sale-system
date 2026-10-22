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
import { getShopProfile } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { adressesRestore, erreurReseau } from "@/lib/sync/adresses";
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
/** L'adresse qui a servi à OUVRIR le job : le job n'existe que là. */
const KEY_RESTORE_BASE = "restore_base_url";

/**
 * Les instances locales à essayer, dans l'ordre : celle configurée (si elle
 * existe), puis le cloud.
 *
 * Le repli sur le cloud est la RÉSILIENCE de la caisse : une instance locale
 * éteinte ne doit pas rendre la récupération impossible. Le cloud garde l'archive
 * courante — le local sert surtout ce que le cloud a oublié.
 */
function adresses(): string[] {
  return adressesRestore(getOrchestratorUrl());
}

/**
 * Les identifiants du compte, quand on les a.
 *
 * Le cloud n'en a pas besoin (il connaît la caisse par son `device_id`), mais
 * l'instance locale les EXIGE : elle tient l'archive du compte et ne la sert
 * qu'à lui. Sans eux, la restauration locale serait refusée.
 */
async function identifiantsCompte(): Promise<{
  account_phone: string;
  account_password: string;
} | null> {
  const profile = await getShopProfile();
  if (!profile?.accountPhone || !profile.accountPassword) return null;
  return { account_phone: profile.accountPhone, account_password: profile.accountPassword };
}

async function orchestratorPost<T>(path: string, body: unknown): Promise<T> {
  const liste = adresses();
  let dernier: unknown = null;
  for (const base of liste) {
    try {
      return await postUn<T>(base, path, body);
    } catch (err) {
      // Un refus du service (401, 403…) est une RÉPONSE : on la remonte, on ne
      // va pas demander au cloud à la place (il répondrait la même chose).
      if (!erreurReseau(err)) throw err;
      dernier = err;
    }
  }
  throw dernier instanceof Error ? dernier : new Error("Aucun service de sauvegarde n'a répondu.");
}

async function postUn<T>(base: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
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
  const identifiants = await identifiantsCompte();
  const resultat = await orchestratorPost<RestoreRequestResult>("/api/v1/restore", {
    device_id: identity.deviceId,
    shop_id: identity.shopId,
    // L'instance locale exige les identifiants du compte : sans eux, elle refuse
    // de servir l'archive (elle ne la distribue pas à quiconque approche).
    ...(identifiants ?? {}),
  });
  // On note l'adresse qui a servi : le job sera relu AU MÊME endroit, même si le
  // commerçant change d'adresse entre-temps.
  await memoriserBaseRestore(resultat.job_id);
  return resultat;
}

/**
 * L'adresse qui a ouvert le job. Mémorisée à l'ouverture : le job est un jeton
 * qui n'existe que sur le service qui l'a créé.
 */
async function memoriserBaseRestore(jobId: string): Promise<void> {
  await getDB().settings.put({ key: KEY_RESTORE_JOB, value: jobId });
  await getDB().settings.put({ key: KEY_RESTORE_BASE, value: adresses()[0] });
}

async function adresseDuJob(jobId: string): Promise<string> {
  const memorise = await getDB()
    .settings.get(KEY_RESTORE_BASE)
    .then((r) => (typeof r?.value === "string" ? r.value : null))
    .catch(() => null);
  if (memorise) return memorise;
  // Ancien job (mémorisé avant cette version) : on retombe sur l'adresse courante.
  return adresses()[0];
}

/**
 * Consomme l'archive page par page jusqu'au bout. Chaque page est appliquée avant la
 * suivante : si le téléphone s'interrompt au milieu, la reprise repart de la page
 * atteinte et `processed_ops` fait le reste.
 *
 * Le job reste REJOUABLE côté serveur : le rappeler ne détruit rien.
 *
 * ⚠️ Le `job_id` fait office de JETON d'accès : il est aléatoire et n'existe que si
 * les identifiants du compte ont été vérifiés à l'ouverture. C'est le même modèle
 * que le cloud — mais sur un réseau local, le trafic est visible par les voisins
 * Wi-Fi : l'instance locale devrait donc être jointe depuis un réseau de confiance.
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

  // Le job a été ouvert sur UNE adresse (le local s'il répondait, le cloud sinon).
  // On interroge donc la MÊME adresse pour le relire : le job n'existe que là.
  const base = await adresseDuJob(jobId);

  while (rounds++ < MAX_ROUNDS) {
    const url =
      `${base}/api/v1/restore/${encodeURIComponent(jobId)}` +
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
      // Même chemin que le canal P2P : déduplication par `processed_ops`, application
      // atomique. SAUF la vérification des signatures : les opérations viennent de
      // l'ARCHIVE du compte (chiffrée, servie par un job que seul un écran du compte
      // peut ouvrir) — le serveur engage sa parole, et le client ne peut plus vérifier
      // des signatures dont les clés ont disparu avec sa fiche locale.
      const r = await applyRemoteOps(ops, { fromArchive: true });
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
export async function recallRestoreJob(): Promise<string | null> {
  const row = await getDB().settings.get(KEY_RESTORE_JOB);
  return typeof row?.value === "string" ? row.value : null;
}

export async function forgetRestoreJob(): Promise<void> {
  await getDB().settings.delete(KEY_RESTORE_JOB);
  await getDB().settings.delete(KEY_RESTORE_BASE);
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
  // L'identifiant transmis est celui de la FICHE BOUTIQUE (celui que le serveur
  // connaît), pas l'identité du canal P2P : ce sont deux identifiants pour le même
  // téléphone, et le serveur ne reconnaît que le premier. Avec le second, la
  // restauration était refusée d'emblée (« écran inconnu du service ») — donc
  // IMPOSSIBLE, alors que la carte « Restaurer » était là depuis le début.
  const profile = await getShopProfile();
  if (!profile?.deviceId) {
    throw new Error("Aucune boutique enregistrée sur cet appareil : impossible de restaurer.");
  }
  return { deviceId: profile.deviceId, shopId: refreshed };
}
