// Écran de chargement animé affiché au démarrage de l'application.
// Le texte "ELYNDRA CAISSE" s'étire puis se contracte (Framer Motion),
// donnant un signal visuel pendant l'initialisation de Dexie.
import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-background">
      <motion.div
        className="flex items-center gap-3 text-3xl font-bold tracking-tight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.span
          className="text-primary"
          animate={{
            letterSpacing: ["0em", "0.25em", "0em"],
          }}
          transition={{
            duration: 1.8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        >
          ELYNDRA
        </motion.span>
        <motion.span
          className="text-foreground"
          animate={{
            letterSpacing: ["0em", "0.25em", "0em"],
          }}
          transition={{
            duration: 1.8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.4,
            delay: 0.15,
          }}
        >
          CAISSE
        </motion.span>
      </motion.div>
      <motion.p
        className="mt-4 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Chargement…
      </motion.p>
    </div>
  );
}
