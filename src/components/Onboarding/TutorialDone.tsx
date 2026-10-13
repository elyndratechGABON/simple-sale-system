import { motion } from "framer-motion";
import { ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClusterTutorialApi } from "./useClusterTutorial";

export function TutorialDone({ t }: { t: ClusterTutorialApi }) {
  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h1 className="sr-only">Tout est prêt</h1>
      {/* Même garde-fou paysage que l'écran « Boutique prête » ci-dessus. */}
      <div className="flex min-h-[min(300px,45dvh)] flex-col items-center justify-center text-center space-y-6 py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
        >
          <PartyPopper className="h-8 w-8 text-primary" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Tout est prêt !</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {t.addedCount > 0
              ? `${t.addedCount} ${t.addedCount === 1 ? "élément enregistré" : "éléments enregistrés"}. Votre boutique "${t.prefs.workspaceName}" est prête à vendre.`
              : `Votre boutique "${t.prefs.workspaceName}" est configurée. Vous pourrez ajouter vos éléments plus tard.`}
          </p>
        </div>
        <Button size="lg" className="gap-2" onClick={t.onComplete}>
          {t.tutorialConfig.finalCtaLabel} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
