import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { PLANS, type PlanInfo } from "@/lib/pricing";
import { fadeUp, glowShadow } from "./landing-motion";

// ============================================================================
// Tarification : trois offres qui ne diffèrent QUE par le prix et le nombre
// d'appareils — la liste des fonctionnalités est donc affichée une seule fois.
// L'or signale le Premium.
// ============================================================================

const PLAN_FEATURES = [
  "Caisse rapide, monnaie automatique",
  "Stocks avec alertes de rupture",
  "Rapports : revenus, bénéfices, marges",
  "Historique clients complet",
  "Exports PDF, Excel et sauvegarde",
  "Fonctionne hors ligne",
];

// Drapeaux propres à la page d'accueil, dérivés d'une seule source de vérité (pricing.ts) :
// le palier « le plus choisi » (isPopular) est mis en avant, le plus cher (or) est Premium.
function PlanCard({ plan, index }: { plan: PlanInfo; index: number }) {
  const featured = plan.isPopular === true;
  const premium = plan.price === Math.max(...PLANS.map((p) => p.price));
  return (
    <motion.div
      key={plan.id}
      className={[
        "relative flex flex-col items-center justify-center rounded-[2rem] border bg-card p-8 text-center transition-shadow",
        glowShadow,
        premium ? "border-[#d4af37]/60 shadow-[0_28px_70px_-30px_rgba(212,175,55,0.45)]" : "",
        featured ? "ring-2 ring-primary/60" : "",
      ].join(" ")}
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: index * 0.08 }}
    >
      {featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold whitespace-nowrap text-primary-foreground">
          Le plus choisi
        </span>
      )}
      {premium && (
        <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#d4af37] px-4 py-1 text-xs font-bold whitespace-nowrap text-[#231a02]">
          <Star className="h-3.5 w-3.5 fill-current" /> Premium
        </span>
      )}
      <h3
        className={
          premium
            ? "text-lg font-bold tracking-tight text-[#6e5310]"
            : "text-lg font-bold tracking-tight"
        }
      >
        {plan.name}
      </h3>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span
          className={
            premium
              ? "text-4xl font-bold tracking-tight text-[#a8842a] tabular-nums"
              : "text-4xl font-bold tracking-tight tabular-nums"
          }
        >
          {new Intl.NumberFormat("fr-FR").format(plan.price)}
        </span>
        <span className="text-lg font-semibold text-muted-foreground">F</span>
        <span className="text-sm text-muted-foreground">/ période</span>
      </p>
      <p className="mt-1 text-sm font-medium text-primary">
        {plan.devices} appareil{plan.devices > 1 ? "s" : ""}
      </p>
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="tarifs" className="scroll-mt-20">
      <div className="mx-auto max-w-[1200px] space-y-12 px-4 py-16 lg:px-8 lg:py-24">
        <motion.div className="mx-auto max-w-2xl space-y-3 text-center" {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Un prix simple.</h2>
          <p className="text-muted-foreground">
            Trois offres, une logique : payez selon la taille de votre équipe. Épicerie, bar,
            coiffure, boutique — quel que soit votre métier, chaque offre couvre une période
            d'abonnement complète.
          </p>
        </motion.div>

        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        <motion.ul className="mx-auto max-w-md space-y-2.5" {...fadeUp}>
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="leading-snug">{f}</span>
            </li>
          ))}
        </motion.ul>

        <motion.p className="text-center text-xs text-muted-foreground" {...fadeUp}>
          14 jours d'essai offerts sur toutes les offres · sans engagement
        </motion.p>
      </div>
    </section>
  );
}
