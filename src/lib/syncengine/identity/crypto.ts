import type { DeviceKeys, SyncOp } from "../types";
import { getDeviceKeys } from "./state";

/**
 * Corps exact couvert par la signature d'une opération. Les champs qui décrivent
 * l'AUTORITÉ de l'op (`device_id`, `shop_id`, `seq`, `id`, `created_at`, `type`,
 * `entity_id`) et le `payload` — mais ni `sig` ni `status` (cyclage d'outbox local,
 * réécrit après signature) ni aucun champ d'horodatage de mise à jour.
 *
 * `JSON.stringify` est déterministe pour un objet construit dans le même ordre à
 * l'émission et à la vérification : les deux lectures viennent du même JSON issu du
 * relais, donc les clés se présentent dans le même ordre des deux côtés.
 */
export function signableBody(op: SyncOp): string {
  return JSON.stringify({
    id: op.id,
    shop_id: op.shop_id,
    device_id: op.device_id,
    seq: op.seq,
    type: op.type,
    entity_id: op.entity_id,
    payload: op.payload ?? null,
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
