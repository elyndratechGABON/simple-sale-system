// Écran de chargement animé affiché au démarrage de l'application.
//
// Visuel : Ely (pangolin 3D) tenant sa tablette — l'image est utilisée TELLE QUELLE,
// sans aucune retouche. L'animation de chargement vit DANS l'écran de la tablette :
// son cadre est mesuré au pixel sur l'image source (433x577 → écran blanc x[160..291],
// y[215..339], parfaitement axial) et reproduit ici en pourcentages, pour que l'animation
// reste strictement confinée derrière la vitre, marges équilibrées.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Cadre exact de l'écran de la tablette, en % de l'image.
const SCREEN = { left: "36.95%", top: "37.26%", width: "30.48%", height: "21.66%" };

// Particules flottantes : positions/timings déterministes (pas d'aléa au rendu),
// alternance or / émeraude, dérive verticale lente façon lucioles.
const PARTICLES = [
  { left: 6, size: 3, delay: 0, duration: 13, alpha: 0.5, gold: true },
  { left: 14, size: 2, delay: 4, duration: 17, alpha: 0.35, gold: false },
  { left: 22, size: 4, delay: 2, duration: 15, alpha: 0.45, gold: true },
  { left: 31, size: 2, delay: 7, duration: 19, alpha: 0.3, gold: false },
  { left: 39, size: 3, delay: 1, duration: 12, alpha: 0.5, gold: false },
  { left: 48, size: 2, delay: 9, duration: 18, alpha: 0.35, gold: true },
  { left: 57, size: 4, delay: 5, duration: 14, alpha: 0.4, gold: false },
  { left: 66, size: 2, delay: 11, duration: 20, alpha: 0.3, gold: true },
  { left: 74, size: 3, delay: 3, duration: 13, alpha: 0.45, gold: false },
  { left: 82, size: 2, delay: 8, duration: 16, alpha: 0.35, gold: true },
  { left: 90, size: 4, delay: 6, duration: 15, alpha: 0.4, gold: false },
  { left: 95, size: 2, delay: 10, duration: 21, alpha: 0.3, gold: true },
];

/** Décor animé : orbes dérivantes, anneau lent, particules montantes. */
function BackgroundFx() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Anneau doré très discret, rotation quasi immobile */}
      <motion.div
        className="absolute top-1/2 left-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d4af37]/[0.06]"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, ease: "linear", repeat: Infinity }}
      >
        <span className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/25 blur-[1px]" />
        <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#10b981]/25 blur-[1px]" />
      </motion.div>

      {/* Orbes de lumière : dérive lente + respiration */}
      <motion.div
        className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,.18), transparent 65%)" }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, 10, 0], opacity: [0.8, 1, 0.7, 0.8] }}
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-28 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,.14), transparent 65%)" }}
        animate={{ x: [0, -35, 15, 0], y: [0, -25, -5, 0], opacity: [0.7, 1, 0.75, 0.7] }}
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute top-[30%] right-[12%] h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,.08), transparent 70%)" }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
      />

      {/* Lucioles montantes */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute bottom-[-2%] rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.gold ? "#d4af37" : "#34d399",
            boxShadow: `0 0 ${p.size * 3}px ${p.gold ? "rgba(212,175,55,.8)" : "rgba(52,211,153,.8)"}`,
          }}
          animate={{ y: ["0vh", "-112vh"], opacity: [0, p.alpha, p.alpha, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
            repeat: Infinity,
            repeatDelay: 2,
          }}
        />
      ))}
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

/**
 * Compteur de progression : montée douce 0 → 100 (ease-out), courte pause à 100,
 * puis reprise — le démarrage ne dure jamais assez pour voir la boucle.
 * La taille du texte découle de celle de l'écran (lui-même indexé sur vh/vw),
 * donc elle reste proportionnelle sur tous les supports.
 */
function useProgress(): number {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const CLIMB_MS = 2800;
    const HOLD_MS = 800;
    const tick = (t: number) => {
      if (!start) start = t;
      const elapsed = t - start;
      const cycle = elapsed % (CLIMB_MS + HOLD_MS);
      const p = Math.min(1, cycle / CLIMB_MS);
      setPct(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return pct;
}

/** Contenu affiché SUR l'écran de la tablette : anneau + pourcentage. */
function ScreenLoader() {
  const pct = useProgress();
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
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-black">
      {/* Fond : dégradé vert émeraude profond vers noir */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #064e3b 0%, #022c22 38%, #010a08 70%, #000 100%)",
        }}
      />

      {/* Voile blanc : halo doux derrière Ely + remontée lumineuse en bas */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 42% at 50% 44%, rgba(255,255,255,.13), transparent 70%), linear-gradient(to top, rgba(255,255,255,.09), transparent 32%)",
        }}
      />

      {/* Décor animé : orbes, anneau lent, particules */}
      <BackgroundFx />

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
          <img
            src="/splash/ely-tablette.png"
            alt="Ely, mascotte ELYNDRA CAISSE, tenant sa tablette"
            className="h-full w-full object-contain"
            draggable={false}
          />

          {/* Écran de la tablette : cadre mesuré au pixel, rien ne dépasse */}
          <div className="absolute overflow-hidden rounded-[10%]" style={SCREEN}>
            {/* Reflet de vitre discret pour l'intégration */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[10%]"
              style={{
                boxShadow: "inset 0 0 10px rgba(0,0,0,.28), inset 0 1px 2px rgba(255,255,255,.35)",
              }}
            />
            <ScreenLoader />
          </div>
        </div>
      </motion.div>

      {/* Marque + progression */}
      <motion.div
        className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-2 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h1 className="text-sm font-bold tracking-wide text-white/90">ELYNDRA CAISSE</h1>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#10b981,#d4af37)" }}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity }}
          />
        </div>
        <p className="text-[11px] text-white/50">
          Créé par <span className="font-semibold text-white/70">ELYNDRA TECH</span> Gabon
        </p>
      </motion.div>
    </div>
  );
}
