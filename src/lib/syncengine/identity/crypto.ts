import type { DeviceKeys, SyncOp } from "../types";
import { getDeviceKeys } from "./state";

/**
 * JSON CANONIQUE : les clés d'un objet sont triées, récursivement.
 *
 * Pourquoi : la signature ne doit dépendre que du CONTENU de l'op, jamais de
 * l'ordre des clés. Or le relais stocke le payload en JSONB — PostgreSQL réordonne
 * les clés (par longueur, puis alphabétique) en le stockant. La signature calculée à
 * l'émission ne se vérifiait donc plus à la réception : TOUTE op distante était
 * rejetée en silence, et rien ne se propageait entre écrans (ni fiche, ni stock, ni
 * vente). Les tests ne le voyaient pas : leur relais de test est une Map en mémoire,
 * qui conserve l'ordre d'insertion.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(src)
        .sort()
        .map((k) => [k, canonical(src[k])]),
    );
  }
  return value;
}

/**
 * Corps exact couvert par la signature d'une opération. Les champs qui décrivent
 * l'AUTORITÉ de l'op (`device_id`, `shop_id`, `seq`, `id`, `created_at`, `type`,
 * `entity_id`) et le `payload` — mais ni `sig` ni `status` (cyclage d'outbox local,
 * réécrit après signature) ni aucun champ d'horodatage de mise à jour.
 *
 * Le `payload` est mis en forme CANONIQUE (cf. `canonical`) : le corps signé est
 * alors identique à l'émission et à la réception, quel que soit l'ordre des clés
 * adopté par le stockage.
 */
export function signableBody(op: SyncOp): string {
  return JSON.stringify({
    id: op.id,
    shop_id: op.shop_id,
    device_id: op.device_id,
    seq: op.seq,
    type: op.type,
    entity_id: op.entity_id,
    payload: op.payload === undefined || op.payload === null ? null : canonical(op.payload),
    created_at: op.created_at,
  });
}

const b64 = {
  enc(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },
  dec(s: string): Uint8Array {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  },
};

/** Paramètres de la paire de signature. ECDSA P-256 : clé 64 octets, signature 64 octets —
 *  contre 256/256 pour RSA, sur le canal qui transporte le catalogue à chaque rotation. */
const SIGN_ALGO = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_HASH = { name: "ECDSA", hash: "SHA-256" } as const;

/** Une clé d'un ancien déploiement (RSA-OAEP, jamais utilisée pour signer) est-elle
 *  réutilisable ici ? Non : l'algorithme ne correspond pas. */
export function isSigningJwk(jwk: string | undefined): boolean {
  if (!jwk) return false;
  try {
    const parsed = JSON.parse(jwk) as JsonWebKey;
    return parsed.kty === "EC" && parsed.crv === "P-256";
  } catch {
    return false;
  }
}

async function importKey(jwk: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const parsed = JSON.parse(jwk) as JsonWebKey;
  // Le JWK exporté porte le `key_ops` de sa génération ; les usages demandés font
  // autorité, on retire l'attribut pour éviter un conflit à l'import.
  delete parsed.key_ops;
  return crypto.subtle.importKey("jwk", parsed, SIGN_ALGO, false, usages);
}

/**
 * Le corps exact couvert par la signature d'une PREUVE DE PAIEMENT (un SMS de
 * paiement transmis à l'orchestrateur).
 *
 * Les clés sont TRIÉES : le corps signé doit être identique à l'émission et à la
 * vérification, et le JSON ne garantit pas l'ordre d'un objet. Le serveur fait de
 * même (`signableProofBody`), donc les deux côtés s'accordent quoi qu'il arrive.
 */
export function signableProofBody(proof: {
  device_id: string;
  from?: string;
  received_at: number;
  sms: string;
}): string {
  const corps: Record<string, unknown> = {
    device_id: proof.device_id,
    from: proof.from ?? "",
    received_at: Number(proof.received_at) || 0,
    sms: proof.sms,
  };
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(corps)
        .sort()
        .map((k) => [k, corps[k]]),
    ),
  );
}

/**
 * Signe une preuve de paiement avec la clé de CET appareil.
 *
 * C'est ce qui remplace le secret partagé d'une passerelle tierce : le serveur sait
 * que la preuve vient bien de l'écran concerné, et pas d'un tiers qui usurpe un
 * numéro de téléphone.
 */
export async function signProof(proof: {
  device_id: string;
  from?: string;
  received_at: number;
  sms: string;
}): Promise<string> {
  const { privateKey } = getDeviceKeys();
  if (!privateKey) throw new Error("Cet appareil n'a pas de clé de signature.");
  const key = await importKey(privateKey, ["sign"]);
  const sig = await crypto.subtle.sign(
    SIGN_HASH,
    key,
    new TextEncoder().encode(signableProofBody(proof)),
  );
  return b64.enc(sig);
}

/** Signe `op` avec la clé privée de cet appareil. Renvoie l'op à pousser. */
export async function signOp(op: SyncOp): Promise<SyncOp> {
  const { privateKey } = getDeviceKeys();
  if (!privateKey) return op;
  const key = await importKey(privateKey, ["sign"]);
  const sig = await crypto.subtle.sign(SIGN_HASH, key, new TextEncoder().encode(signableBody(op)));
  return { ...op, sig: b64.enc(sig) };
}

/** `verify` de WebCrypto est déjà à temps constant. */
export async function verifyOpSignature(op: SyncOp, publicKeyJwk: string): Promise<boolean> {
  if (!op.sig || !publicKeyJwk) return false;
  try {
    const key = await importKey(publicKeyJwk, ["verify"]);
    return await crypto.subtle.verify(
      SIGN_HASH,
      key,
      b64.dec(op.sig) as unknown as BufferSource,
      new TextEncoder().encode(signableBody(op)),
    );
  } catch {
    // Clé illisible ou signature malformée : refus, jamais d'exception qui remonterait
    // jusqu'à l'appelant et laisserait l'op Applied.
    return false;
  }
}

export function generateKeyPair(): Promise<DeviceKeys> {
  return crypto.subtle.generateKey(SIGN_ALGO, true, ["sign", "verify"]).then(async (pair) => {
    const [publicKey, privateKey] = await Promise.all([
      crypto.subtle.exportKey("jwk", pair.publicKey),
      crypto.subtle.exportKey("jwk", pair.privateKey),
    ]);
    return {
      publicKey: JSON.stringify(publicKey),
      privateKey: JSON.stringify(privateKey),
    };
  });
}

export function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
