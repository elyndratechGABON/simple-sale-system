import { motion } from "framer-motion";

const BRAND = "ELYNDRA CAISSE";
const SIGNATURE = "Made by ELYNDRA TECH GABON";

/**
 * Écran de chargement PREMIUM (mission refonte UI — Étape 1) : sobre plutôt que
 * festif. La marque apparaît en fondu au centre (une seule fois — pas de boucle),
 * une barre de progression FINE se remplit lentement en bas, sous elle la signature
 * "Made by ELYNDRA TECH GABON". Fond : dégradé émeraude lent (aucun particule
 * distrayant — une caisse attend, elle ne regarde pas un spectacle).
 *
 * Le layout (/_app) bascule vers l'application à la fin des ~2,2 s d'animation.
 */
export function LoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
    >
      {/* Fond : dégradé lent (12 s) du vert profond vers le noir — sobre, sans particules. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 20%, color-mix(in oklab, var(--primary) 22%, var(--background)) 0%, var(--background) 62%)",
        }}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.h1
        aria-label={BRAND}
        className="relative flex flex-wrap justify-center text-3xl font-black tracking-[0.28em] text-foreground sm:text-4xl"
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {BRAND.split("").map((char, i) => (
          <motion.span
            key={`${char}-${i}`}
            aria-hidden="true"
            className="inline-block"
            style={{ whiteSpace: "pre" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.045, duration: 0.45, ease: "easeOut" }}
          >
            {char}
          </motion.span>
        ))}
      </motion.h1>

      <motion.div
        className="relative mt-4 text-xs tracking-[0.35em] text-muted-foreground uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        Système de caisse hors ligne
      </motion.div>

      {/* Barre de chargement fine (2 px), bordée de crème : elle fait le lien visuel
          entre l'écran de splash et l'app qui s'exécute ensuite (~85 % sur 2,2 s). */}
      <div
        className="absolute bottom-14 left-1/2 w-56 -translate-x-1/2"
        role="progressbar"
        aria-label="Chargement"
      >
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-muted/60">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "4%" }}
            animate={{ width: "85%" }}
            transition={{ duration: 2.1, ease: "easeInOut" }}
          />
        </div>
        <motion.p
          className="mt-3 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          {SIGNATURE}
        </motion.p>
      </div>
    </motion.div>
  );
}
