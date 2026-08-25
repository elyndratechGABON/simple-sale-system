import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/db";
import { parseOrder, type ParseResult } from "@/lib/voice/parser";
import {
  blobToMono16k,
  onVoiceProgress,
  startRecording,
  transcribeClip,
  type ActiveRecording,
} from "@/lib/voice/engine";
import { cn } from "@/lib/utils";

interface VoiceDictationProps {
  products: Product[];
  onResult: (result: ParseResult) => void;
}

type Phase = "idle" | "recording" | "processing";

const MODEL_HINT = "Première utilisation : modèle vocal (~40 Mo) téléchargé une fois pour toutes.";

/**
 * Dictée de commande : appui sur le micro, phrase à voix haute, appui pour terminer.
 * L'analyse (Whisper local + parsing) tourne ensuite hors ligne ; le résultat est rendu
 * au parent via `onResult` — ce composant ne touche jamais au panier lui-même.
 */
export function VoiceDictation({ products, onResult }: VoiceDictationProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<ActiveRecording | null>(null);

  useEffect(() => {
    if (!open || phase !== "recording") return;
    setElapsed(0);
    const started = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      500,
    );
    return () => window.clearInterval(timer);
  }, [open, phase]);

  useEffect(() => {
    return () => recordingRef.current?.cancel();
  }, []);

  const close = useCallback(() => {
    recordingRef.current?.cancel();
    recordingRef.current = null;
    setOpen(false);
    setPhase("idle");
    setDownloadPct(null);
    setError(null);
  }, []);

  async function beginRecording() {
    setError(null);
    try {
      recordingRef.current = await startRecording();
      setPhase("recording");
    } catch {
      setError("Micro inaccessible. Vérifiez l'autorisation dans les réglages du navigateur.");
    }
  }

  async function finishRecording() {
    const recording = recordingRef.current;
    if (!recording) return;
    setPhase("processing");
    try {
      const blob = await recording.stop();
      recordingRef.current = null;
      if (blob.size === 0) throw new Error("empty");
      const audio = await blobToMono16k(blob);
      // Le premier appel charge le modèle (~40 Mo) : on relaie l'avancement.
      onVoiceProgress((pct) => setDownloadPct(pct));
      const transcript = await transcribeClip(audio);
      const result = parseOrder(transcript, products);
      close();
      onResult(result);
    } catch {
      setError("La dictée n'a pas abouti. Réessayez en parlant distinctement.");
    }
  }

  function cancelRecording() {
    recordingRef.current?.cancel();
    recordingRef.current = null;
    setPhase("idle");
  }

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Mic className="h-4 w-4 mr-1" /> Dicter
      </Button>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-background/95 p-6 backdrop-blur-sm">
          <button
            onClick={close}
            aria-label="Fermer la dictée"
            // Seule sortie du mode dictée : cible tactile pleine (44px).
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          {error ? (
            <>
              <p className="max-w-xs text-center text-sm font-medium text-destructive">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setError(null)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Réessayer
                </Button>
                <Button variant="ghost" onClick={close}>
                  Fermer
                </Button>
              </div>
            </>
          ) : phase === "processing" ? (
            <>
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {downloadPct === null
                  ? "Analyse de la commande…"
                  : `Téléchargement du modèle vocal ${downloadPct}%`}
              </p>
              <p className="max-w-xs text-center text-xs text-muted-foreground">{MODEL_HINT}</p>
            </>
          ) : (
            <>
              <button
                onClick={phase === "recording" ? finishRecording : beginRecording}
                aria-label={phase === "recording" ? "Terminer la dictée" : "Commencer la dictée"}
                className={cn(
                  "flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95",
                  phase === "recording"
                    ? "bg-red-500 animate-pulse"
                    : "bg-primary hover:bg-primary/90",
                )}
              >
                <Mic className="h-12 w-12" />
              </button>
              <p className="font-semibold tabular-nums">{phase === "recording" ? mmss : ""}</p>
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {phase === "recording"
                  ? "Appuyez pour terminer — « deux Regab et un kilo de manioc »"
                  : "Appuyez et dictez votre commande"}
              </p>
              {phase === "idle" && (
                <p className="max-w-xs text-center text-xs text-muted-foreground">{MODEL_HINT}</p>
              )}
              {phase === "recording" && (
                <Button variant="ghost" size="sm" onClick={cancelRecording}>
                  Annuler
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
