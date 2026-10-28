// CANAL DIRECT LAN (Étape 3 — mission latence).
//
// Le relais est public etHTTP : chaque op y voyage en deux rotations (push de
// l'émetteur, pull du récepteur). Pour une vente c'est acceptable — la caisse est
// offline-first et l'écrit local fait foi. Pour la RÉSERVATION optimiste, c'est
// trop lent : deux vendeurs en salle doivent se voir main dans la main.
//
// Ici, chaque écran appairé OUVRIT un RTCDataChannel direct avec ses pairs du
// MÊME shop_id (réseau local : iceServers vide, host candidates only — rien ne
// sort du LAN). La signalisation (offer/answer SDP complets, pas de trickle)
// voyage DANS les ops existantes : le transport P2P du relais sert d'agent
// signal, et le relais reste le REBEFOUR — si le canal direct n'aboutit pas
// (NAT touffu, Wi-Fi isolé), rien ne casse : la boucle d'échange fait son cycle
// comme avant, c'est simplement moins vite.
//
// Sécurité : une op reçue par le canal direct passe par `applyRemoteOps` — les
// ECRITS vérifiés par signature, comme au relais. Le canal ne porte que des ops
// DÉJÀ signées (`signAll`), il n'ouvre aucune porte supplémentaire.
//
// WHO-RATE- WHAT : l'émetteur de l'offre est l'appareil au deviceId lexicographique
// inférieur — deterministic, sans glare ni négociation parallèle.
import { getDB } from "@/lib/db";
import { getIdentity, isSharedGroup } from "./identity";
import { applyRemoteOps } from "./apply";
import type { SyncOp } from "./types";

const SIGNAL_TYPES = new Set(["webrtc.offer", "webrtc.answer"]);
const RETRY_MS = 30_000;

const channels = new Map<string, RTCDataChannel>();
const connections = new Map<string, RTCPeerConnection>();

export function hasOpenChannel(deviceId: string): boolean {
  const ch = channels.get(deviceId);
  return ch?.readyState === "open";
}

/** Fan-out : opération(s) signées vers les canaux directs ouverts (best-effort). */
export function forwardToPeers(ops: SyncOp[]): void {
  if (channels.size === 0 || ops.length === 0) return;
  const body = JSON.stringify(ops);
  for (const ch of channels.values()) {
    if (ch.readyState === "open") {
      try {
        ch.send(body);
      } catch {
        // canal mourant : le relais fera le travail
      }
    }
  }
}

/** Ops de signalisation issues du relayage — consommées ICI, pas au dispatch. */
export function deliverSignaling(signaling: SyncOp[]): void {
  if (signaling.length === 0) return;
  void (async () => {
    const me = getIdentity();
    for (const op of signaling) {
      if (op.device_id === me.deviceId) continue;
      const pl = op.payload as { sdp: string };
      if (!pl?.sdp) continue;
      if (op.type === "webrtc.offer") await answerPeer(op.device_id, pl.sdp, op.id);
      else if (op.type === "webrtc.answer") await completeOffer(op.device_id, pl.sdp);
    }
  })();
}

async function ensurePeer(peerId: string): Promise<RTCPeerConnection | null> {
  if (typeof RTCPeerConnection === "undefined") return null;
  const existing = connections.get(peerId);
  if (existing && existing.connectionState !== "failed" && existing.connectionState !== "closed")
    return existing;
  if (existing) {
    existing.close();
    connections.delete(peerId);
  }
  const pc = new RTCPeerConnection({ iceServers: [] }); // LAN uniquement
  connections.set(peerId, pc);
  pc.onconnectionstatechange = () => {
    if (["failed", "closed"].includes(pc.connectionState)) {
      channels.delete(peerId);
      connections.delete(peerId);
    }
  };
  pc.ondatachannel = (ev) => attachChannel(peerId, ev.channel);
  return pc;
}

function attachChannel(peerId: string, ch: RTCDataChannel): void {
  ch.onmessage = (ev) => {
    void (async () => {
      try {
        const ops = JSON.parse(String(ev.data)) as SyncOp[];
        if (Array.isArray(ops) && ops.length > 0) await applyRemoteOps(ops);
      } catch {
        // message illisible : le relais corrigera au prochain cycle
      }
    })();
  };
  ch.onopen = () => channels.set(peerId, ch);
  ch.onclose = () => channels.delete(peerId);
}

async function initiateOffer(peerId: string): Promise<void> {
  const me = getIdentity();
  if (me.deviceId >= peerId) return; // seul LE PLUS PETIT fait l'offre (anti-glare)
  if (channels.get(peerId)?.readyState === "open") return;
  const pc = await ensurePeer(peerId);
  if (!pc) return;
  const ch = pc.createDataChannel("pos-ops");
  attachChannel(peerId, ch);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  // ICE complet avant l'envoi : SDP un seul bloc, pas de trickle (le relais  ne
  // délivre pas du fragmenté cheap).
  await waitIce(pc);
  void emitSdp("webrtc.offer", peerId, pc.localDescription?.sdp);
}

function waitIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, 1_500);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

async function answerPeer(peerId: string, sdp: string, opId: string): Promise<void> {
  if (channels.get(peerId)?.readyState === "open") return;
  const pc = await ensurePeer(peerId);
  if (!pc) return;
  // Idempotence : un même offre rejoué ne déclenche pas une réponse en série.
  if (peerAnswered.has(opId)) return;
  peerAnswered.add(opId);
  await pc.setRemoteDescription({ type: "offer", sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitIce(pc);
  void emitSdp("webrtc.answer", peerId, pc.localDescription?.sdp);
}

const peerAnswered = new Set<string>();

async function completeOffer(peerId: string, sdp: string): Promise<void> {
  const pc = connections.get(peerId);
  if (!pc || pc.signalingState === "stable") return;
  try {
    await pc.setRemoteDescription({ type: "answer", sdp });
  } catch {
    connections.delete(peerId);
  }
}

/** Emit d'un SDP dans les ops du journal — hors transaction métier. */
async function emitSdp(
  type: "webrtc.offer" | "webrtc.answer",
  peerId: string,
  sdp: string | undefined,
): Promise<void> {
  if (!sdp) return;
  const { emitOp } = await import("./ops");
  const db = getDB();
  const me = getIdentity();
  await db.transaction("rw", db.sync_ops, db.settings, async () => {
    await emitOp(db, me, { type, entity_id: peerId, payload: { sdp } });
  });
}

/** Démarrage : scan périodique des pairs pour ouvrir les canaux qui manquent. */
let started = false;
export function startWebRtcMesh(): void {
  if (started || typeof RTCPeerConnection === "undefined") return;
  started = true;
  const tick = async () => {
    try {
      const me = getIdentity();
      if (!isSharedGroup(me.shopId)) return;
      const db = getDB();
      const peers = (await db.paired_devices.where("shop_id").equals(me.shopId).toArray()).filter(
        (p) => p.status === "paired" && p.id !== me.deviceId,
      );
      for (const peer of peers) {
        if (channels.get(peer.id)?.readyState === "open") continue;
        await initiateOffer(peer.id);
      }
      // Le polymorhe démarrage : démarré une fois, scan léger pour les canaux manquants.
    } catch {
      // best effort — le relais reste le chemin de secours
    }
  };
  void tick();
  window.setInterval(() => void tick(), RETRY_MS);
}
