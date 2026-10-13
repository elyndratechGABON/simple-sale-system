import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClusterTutorialApi } from "./useClusterTutorial";

export function TutorialConfirm({ t }: { t: ClusterTutorialApi }) {
  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h1 className="sr-only">Votre boutique est prête</h1>
      {/* `min()` en dvh : en paysage sur petit téléphone (≤568px de haut),
          l'écran ne réclame plus une hauteur impossible. */}
      <div className="flex min-h-[min(300px,45dvh)] flex-col items-center justify-center text-center space-y-6 py-4">
        {/* Visuel « Boutique prête » de la marque (logo/Boutique prete.png, réduit
            en webp), à la place de l'icône confettis seule. */}
        <motion.img
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          src="/shop-ready.webp"
          alt="Boutique prête"
          width={560}
          height={373}
          className="w-full max-w-[280px] h-auto rounded-xl"
        />
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Votre boutique est prête !</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {t.tutorialConfig.welcomeMessage}
          </p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => t.setSubStep("add")}>
          {t.tutorialConfig.ctaLabel} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
