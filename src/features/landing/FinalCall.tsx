import { motion } from "framer-motion";
import { InstallCta } from "./InstallCta";
import { fadeUp } from "./landing-motion";

// ============================================================================
// Appel final
// ============================================================================

export function FinalCall() {
  return (
    <motion.section className="border-t bg-muted/40" {...fadeUp}>
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Votre boutique mérite mieux qu'un cahier.
        </h2>
        <p className="text-muted-foreground">
          Installez l'application, créez votre boutique en quelques minutes, et encaissez votre
          premier client aujourd'hui.
        </p>
        <div className="flex justify-center">
          <InstallCta />
        </div>
      </div>
    </motion.section>
  );
}
