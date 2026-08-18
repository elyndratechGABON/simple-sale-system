// Écran de chargement animé affiché au démarrage de l'application.
// Le logo ELYNDRA CAISSE pulse (Framer Motion),
// donnant un signal visuel pendant l'initialisation de Dexie.
import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-background">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.img
          src="/icon-512.png"
          alt="ELYNDRA CAISSE"
          className="w-24 h-24"
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 1.8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        />
        <motion.p
          className="text-sm font-semibold tracking-widest text-primary"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        >
          ELYNDRA CAISSE
        </motion.p>
      </motion.div>
      <motion.p
        className="mt-6 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Chargement…
      </motion.p>
    </div>
  );
}
