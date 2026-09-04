// Écran de chargement affiché au démarrage de l'application.
//
// Fond blanc : l'app s'ouvre sur une page claire, l'écran de chargement ne doit pas
// faire clignoter le thème. Le compteur n'est PAS décoratif : il reçoit la progression
// RÉELLE du démarrage via la prop `progress` et la rend fluide par lissage.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/** Lissage exponentiel : le pourcentage affiché rattrape la cible réelle sans à-coups. */
function useSmoothProgress(target: number): number {
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setDisplay((d) => {
        const diff = target - d;
        return Math.abs(diff) < 0.5 ? target : d + diff * 0.09;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(display);
}

export function LoadingScreen({ progress }: { progress: number }) {
  const pct = useSmoothProgress(progress);

  const [imgState, setImgState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-white">
      {/* Décor très doux : halos émeraude/or aux coins */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 38% at 18% 12%, rgba(16,185,129,.07), transparent 70%), radial-gradient(44% 36% at 84% 88%, rgba(212,175,55,.08), transparent 70%)",
        }}
      />

      {/* Image centrée, grande */}
      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative w-full max-w-[85vw] sm:max-w-[60vw] lg:max-w-[42vw]">
          {/* Squelette pulsant tant que l'image charge */}
          {imgState === "loading" && (
            <motion.div
              aria-hidden
              className="absolute inset-[8%] rounded-[8%] bg-emerald-900/[0.06]"
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
            />
          )}
          {imgState !== "error" && (
            <img
              src="/splash/splash.png"
              alt="ELYNDRA CAISSE — chargement"
              className="relative w-full object-contain transition-opacity duration-500"
              style={{ opacity: imgState === "ready" ? 1 : 0 }}
              draggable={false}
              onLoad={() => setImgState("ready")}
              onError={() => setImgState("error")}
            />
          )}
        </div>
      </motion.div>

      {/* Marque + barre de progression */}
      <motion.div
        className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-2 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h1 className="text-sm font-bold tracking-wide text-neutral-800">ELYNDRA CAISSE</h1>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#10b981,#d4af37)" }}
          />
        </div>
        <p className="text-[11px] text-neutral-500">
          Créé par <span className="font-semibold text-neutral-700">ELYNDRA TECH</span> Gabon
        </p>
      </motion.div>
    </div>
  );
}
