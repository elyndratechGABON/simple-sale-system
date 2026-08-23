/**
 * Moteur de dictée vocale local — l'équivalent navigateur de la pile de Handy :
 * enregistrement micro → Whisper (quantifié q8, ~40 Mo téléchargés UNE fois puis mis en
 * cache par le navigateur) → texte. Aucun serveur, aucune clé d'API.
 *
 * Le paquet @huggingface/transformers est importé dynamiquement : il ne rejoint jamais
 * le bundle principal et n'est chargé qu'au premier appui sur le micro.
 */

import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import type { ProgressInfo } from "@huggingface/transformers";

let pipePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let progressListener: ((pct: number) => void) | null = null;

/** Reçoit l'avancement du téléchargement du modèle (0-100), une seule fois par fichier. */
export function onVoiceProgress(cb: (pct: number) => void): void {
  progressListener = cb;
}

/**
 * Le typage exporté de transformers.js produit une union trop complexe pour tsc
 * (TS2590) : on n'importe donc que la surface réellement utilisée.
 */
interface TransformersModule {
  pipeline(
    task: "automatic-speech-recognition",
    model: string,
    options?: {
      dtype?: "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4";
      progress_callback?: (info: ProgressInfo) => void;
    },
  ): Promise<AutomaticSpeechRecognitionPipeline>;
  env: { backends: { onnx: { wasm?: { wasmPaths?: string } } } };
}

async function loadPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  const { pipeline, env } = (await import("@huggingface/transformers")) as TransformersModule;
  if (import.meta.env.PROD) {
    // Les binaires onnxruntime sont copiés dans assets/ au build
    // (scripts/copy-onnx-wasm.mjs) : la dictée doit marcher hors ligne dès
    // l'installation, pas seulement après un premier usage connecté.
    const wasm = env.backends.onnx.wasm;
    if (wasm) wasm.wasmPaths = "/assets/";
  }
  return pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
    dtype: "q8",
    progress_callback: (info: ProgressInfo) => {
      if (info.status === "progress" && typeof info.progress === "number") {
        progressListener?.(Math.min(100, Math.round(info.progress)));
      }
    },
  });
}

/** Transcrit un clip 16 kHz mono. Bloque ~2-6 s sur un téléphone milieu de gamme. */
export async function transcribeClip(audio: Float32Array): Promise<string> {
  if (!pipePromise) {
    pipePromise = loadPipeline().catch((e) => {
      // Ne pas garder une promesse rejetée en cache : le prochain essai retentera.
      pipePromise = null;
      throw e;
    });
  }
  const pipe = await pipePromise;
  const out = await pipe(audio, { language: "french", task: "transcribe" });
  const text = Array.isArray(out) ? out[0]?.text : out.text;
  return (text ?? "").trim();
}

// ---------- Capture microphone ----------

export interface ActiveRecording {
  /** Termine l'enregistrement et rend le clip brut. */
  stop: () => Promise<Blob>;
  /** Coupe le micro sans rien rendre (bouton Annuler). */
  cancel: () => void;
}

export async function startRecording(): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const shutdown = () => stream.getTracks().forEach((t) => t.stop());
  const assemble = () => new Blob(chunks, { type: recorder.mimeType || "audio/webm" });

  return {
    stop: async () => {
      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(assemble());
        if (recorder.state !== "inactive") recorder.stop();
        else resolve(assemble());
      });
      shutdown();
      return blob;
    },
    cancel: () => {
      try {
        recorder.stop();
      } catch {
        // déjà arrêté
      }
      shutdown();
    },
  };
}

/**
 * Décode n'importe quel conteneur accepté par MediaRecorder (webm/opus, mp4/aac selon
 * le navigateur) et le ramène en mono 16 kHz — le format que Whisper attend.
 */
export async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const buffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(buffer);
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    void ctx.close();
  }
}
