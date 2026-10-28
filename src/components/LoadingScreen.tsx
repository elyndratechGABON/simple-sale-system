import { motion } from "framer-motion";

interface LoadingScreenProps {
  progress: number;
}

const BRAND = "ELYNDRA CAISSE";

export function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <motion.h1
          aria-label={BRAND}
          className="flex text-3xl font-black tracking-[0.2em] sm:text-4xl"
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {BRAND.split("").map((char, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="inline-block bg-gradient-to-b from-primary via-emerald-300 to-primary bg-clip-text text-transparent [text-shadow:0_0_24px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
              style={{ whiteSpace: "pre" }}
              initial={{ y: 24, opacity: 0 }}
              animate={{
                y: [24, 0, -4, 0],
                opacity: [0, 1, 1, 1],
              }}
              transition={{
                delay: i * 0.06,
                duration: 1.6,
                times: [0, 0.4, 0.7, 1],
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: "easeOut",
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.h1>
        <div className="w-64">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
            {progress < 100 ? "Création de l'espace employé…" : "Terminé !"}
          </p>
        </div>
      </div>
    </div>
  );
}
