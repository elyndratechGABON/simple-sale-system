// Écran de chargement animé affiché au démarrage de l'application.
//
// Visuel : Ely (pangolin 3D) tenant sa tablette — l'image est utilisée TELLE QUELLE,
// sans aucune retouche. L'animation de chargement vit DANS l'écran de la tablette :
// son cadre est mesuré au pixel sur l'image source (433x577 → écran blanc x[160..291],
// y[215..339], parfaitement axial) et reproduit ici en pourcentages, pour que l'animation
// reste strictement confinée derrière la vitre, marges équilibrées.
//
// Le compteur n'est PAS décoratif : il reçoit la progression RÉELLE du démarrage
// (profil boutique créé, synchronisation terminée) via la prop `progress`, et la
// rend fluide par lissage. Fond blanc : l'app s'ouvre sur une page claire, l'écran
// de chargement ne doit pas faire clignoter le thème.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Cadre exact de l'écran de la tablette, en % de l'image.
const SCREEN = { left: "36.95%", top: "37.26%", width: "30.48%", height: "21.66%" };

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

/** Contenu affiché SUR l'écran de la tablette : anneau + pourcentage réel. */
function ScreenLoader({ pct }: { pct: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[7%]">
      {/* Anneaux */}
      <div className="relative h-[42%] aspect-square">
        <ArcRing />
        <ArcRing reverse thickness="8%" duration={2.4} />
        {/* Halo expansif */}
        <motion.div
          className="absolute inset-[16%] rounded-full border border-[#d4af37]/60"
          animate={{ scale: [0.7, 1.35], opacity: [0.5, 0] }}
          transition={{ duration: 1.6, ease: "easeOut", repeat: Infinity }}
        />
        {/* Point central émeraude */}
        <motion.div
          className="absolute inset-[28%] rounded-full bg-[#10b981]"
          style={{ boxShadow: "0 0 14px rgba(16,185,129,.75), inset 0 0 6px rgba(212,175,55,.5)" }}
          animate={{ scale: [1, 0.86, 1] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
        />
      </div>
      {/* Pourcentage */}
      <span
        className="font-bold tabular-nums leading-none"
        style={{
          fontSize: "min(3vh, 5.2vw)",
          background: "linear-gradient(180deg,#10b981,#d4af37)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function LoadingScreen({ progress }: { progress: number }) {
  const pct = useSmoothProgress(progress);

  // La photo d'Ely se décode en différé (réseau lent, premier lancement) : squelette
  // pulsant à sa place, fondu à l'arrivée, et silence propre si elle échoue.
  const [imgState, setImgState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-white">
      {/* Décor très doux sur blanc : halos émeraude/or aux coins */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 38% at 18% 12%, rgba(16,185,129,.07), transparent 70%), radial-gradient(44% 36% at 84% 88%, rgba(212,175,55,.08), transparent 70%)",
        }}
      />

      {/* Composition verticale : Ely tel quel + animation dans son écran */}
      <motion.div
        className="relative flex h-full w-full items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div
          className="relative select-none"
          style={{ height: "min(76vh, 135vw)", aspectRatio: "433 / 577" }}
        >
          {/* Squelette : silhouette douce derrière l'image tant qu'elle n'est pas prête */}
          {imgState === "loading" && (
            <motion.div
              aria-hidden
              className="absolute inset-[6%] rounded-[8%] bg-emerald-900/[0.06]"
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
            />
          )}
          {imgState !== "error" && (
            <img
              src="/splash/ely-tablette.png"
              alt="Ely, mascotte ELYNDRA CAISSE, tenant sa tablette"
              className="relative h-full w-full object-contain transition-opacity duration-500"
              style={{ opacity: imgState === "ready" ? 1 : 0 }}
              draggable={false}
              onLoad={() => setImgState("ready")}
              onError={() => setImgState("error")}
            />
          )}

          {/* Écran de la tablette : cadre mesuré au pixel, rien ne dépasse.
              Sans photo (erreur), l'anneau reste lisible sur son propre fond clair. */}
          <div
            className={`absolute overflow-hidden rounded-[10%] ${imgState === "ready" ? "" : "bg-white ring-1 ring-black/5"}`}
          >
            {/* Reflet de vitre discret pour l'intégration */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[10%]"
              style={{
                boxShadow: "inset 0 0 10px rgba(0,0,0,.28), inset 0 1px 2px rgba(255,255,255,.35)",
              }}
            />
            <ScreenLoader pct={pct} />
          </div>
        </div>
      </motion.div>

      {/* Marque + progression réelle (barre calée sur le même pourcentage) */}
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

/** Anneau conique déguisé en arc : le masque radial creuse le disque. */
function ArcRing({ reverse = false, thickness = "13%", duration = 1.6 }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0deg, transparent 250deg, #d4af37 300deg, #10b981 340deg, transparent 360deg)",
        WebkitMaskImage: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}), black calc(100% - ${thickness} + 1px))`,
        maskImage: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}), black calc(100% - ${thickness} + 1px))`,
      }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    />
  );
}
