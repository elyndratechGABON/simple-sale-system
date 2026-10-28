import { motion } from "framer-motion";
import { Check, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { MockSaleToast } from "@/components/landing/mockups";
import { InstallCta } from "./InstallCta";

// ============================================================================
// Hero : promesse à gauche, téléphone vivant à droite
// ============================================================================

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Halo d'accueil, teinté émeraude comme l'écran de démarrage de l'app */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-[1200px] gap-12 px-4 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6 lg:px-8">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" />
            Gestion simple pour votre business
          </span>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Gérez votre business.
            <br />
            <span className="text-primary">Vendez plus simplement.</span>
          </h1>
          <p className="max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
            Ventes, stocks, clients et rapports : tout ce dont votre activité a besoin, dans une
            seule application qui marche même sans internet.
          </p>
          <div className="space-y-3">
            <InstallCta />
            <p className="text-sm text-muted-foreground">
              14 jours d'essai gratuit · aucune carte bancaire requise
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 text-primary" /> Fonctionne hors ligne
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Données sur votre appareil
            </li>
            <li className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Pensé pour le mobile
            </li>
          </ul>
        </motion.div>

        <motion.div
          className="relative mx-auto flex w-full max-w-[520px] items-end justify-center pb-6 lg:max-w-none lg:justify-end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <div className="relative w-full max-w-[330px] lg:w-[78%] lg:max-w-[430px]">
            <img
              src="/logo-body.webp"
              alt="ELYNDRA CAISSE — gérez votre boutique simplement"
              className="w-full select-none object-contain"
              draggable={false}
            />
          </div>
          <MockSaleToast />
        </motion.div>
      </div>
    </section>
  );
}
