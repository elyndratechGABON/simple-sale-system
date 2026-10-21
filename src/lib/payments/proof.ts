// La PREUVE DE PAIEMENT par SMS — le chemin auto-hébergé.
//
// Le principe : le marchand paie son abonnement par Mobile Money, l'opérateur lui
// envoie un SMS de reçu. Au lieu de dépendre d'une passerelle payante (TextBee),
// C'EST L'APPLICATION DU MARCHAND qui lit ce SMS et le transmet à l'orchestrateur,
// signé avec la clé de l'appareil.
//
// Ce que la signature apporte : le serveur sait que la preuve vient bien de cet
// écran, et pas d'un tiers qui usurpe un numéro de téléphone. Ce qu'elle n'apporte
// PAS : la preuve de l'EXISTENCE du paiement — un marchand peut signer un faux SMS.
// C'est pourquoi la validation humaine reste le dernier mot (le SMS arrive
// « à valider » dans le Control Center, jamais « payé »).
//
// Le SMS BRUT est transmis tel quel : le PARSING reste côté serveur (un seul endroit
// à mettre à jour quand un opérateur change le format de ses reçus).
//
// Hors ligne : la preuve est mise en file et repart seule au cycle suivant — le
// marchand paie souvent dans un endroit sans réseau.

import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { getSetting, setSetting } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { ensureIdentity, getDeviceKeys } from "@/lib/syncengine/identity";
import { signProof } from "@/lib/syncengine/identity/crypto";

/** La file des preuves à envoyer, dans le localStorage (elle doit survivre à la purge). */
const PENDING_PROOFS_KEY = "caisse_pos_pending_payment_proofs";
/** Au plus de preuves en attente : au-delà, on garde les plus récentes. */
const MAX_PENDING_PROOFS = 20;

export interface PaymentProof {
  device_id: string;
  /** Le SMS brut, tel que reçu. */
  sms: string;
  /** L'expéditeur (le numéro de l'opérateur). */
  from: string;
  /** La date de réception (ms). */
  received_at: number;
}

interface PendingProof extends PaymentProof {
  sig: string;
  at: number;
  tries: number;
}

function readPending(): PendingProof[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_PROOFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingProof[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(proofs: PendingProof[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PENDING_PROOFS_KEY,
      JSON.stringify(proofs.slice(-MAX_PENDING_PROOFS)),
    );
  } catch {
    /* stockage indisponible : la preuve sera perdue, pas l'application */
  }
}

/**
 * Un SMS de paiement vient d'arriver : on le met en file (signé).
 *
 * Renvoie `true` si la preuve est partie, `false` si elle attend le réseau.
 */
export async function queuePaymentSms(sms: string, from: string): Promise<boolean> {
  const identity = await ensureIdentity();
  const device_id = identity.deviceId;
  const received_at = Date.now();
  const proof: PaymentProof = { device_id, sms, from, received_at };
  let sig: string;
  try {
    sig = await signProof(proof);
  } catch {
    // Pas de clé de signature : on ne peut pas prouver l'origine. La preuve est
    // perdue — c'est le prix de la signature, et c'est le bon prix.
    return false;
  }
  const pending = readPending();
  pending.push({ ...proof, sig, at: Date.now(), tries: 0 });
  writePending(pending);
  return sendPendingProofs();
}

/** Envoie les preuves en attente. Best-effort : un réseau absent les laisse en file. */
export async function sendPendingProofs(): Promise<boolean> {
  const pending = readPending();
  if (pending.length === 0) return false;
  const base = getOrchestratorUrl();
  if (!base) return false;

  const restants: PendingProof[] = [];
  let envoye = false;
  for (const proof of pending) {
    try {
      const res = await fetch(`${base}/api/v1/payments/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: proof.device_id,
          sms: proof.sms,
          from: proof.from,
          received_at: proof.received_at,
          sig: proof.sig,
        }),
      });
      if (res.ok) {
        envoye = true;
        continue; // partie : elle sort de la file
      }
      // 401 = signature refusée : la reprendre ne servirait à rien (la clé a peut-être
      // changé). On l'abandonne.
      if (res.status === 401) continue;
      restants.push({ ...proof, tries: proof.tries + 1 });
    } catch {
      // Réseau absent : la preuve repartira plus tard.
      restants.push({ ...proof, tries: proof.tries + 1 });
    }
  }
  writePending(restants);
  return envoye;
}

/**
 * La clé PUBLIQUE de l'appareil, que l'orchestrateur doit connaître pour vérifier
 * une preuve signée. Elle est envoyée à chaque handshake (le serveur la stocke).
 */
export async function devicePublicKey(): Promise<string | null> {
  const { publicKey } = getDeviceKeys();
  if (!publicKey) return null;
  return publicKey;
}
