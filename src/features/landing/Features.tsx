import { motion } from "framer-motion";
import { Boxes, Check, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { fadeUp, glowShadow } from "./landing-motion";

// ============================================================================
// Fonctionnalités : quatre outils, quatre lignes. La preuve visuelle vit dans
// le hero ; ici on liste, on n'illustre pas.
// ============================================================================

const FEATURES = [
  {
    icon: ShoppingCart,
    title: "Caisse",
    body: "Touchez, validez, rendez la monnaie — calculée automatiquement.",
  },
  {
    icon: Boxes,
    title: "Stocks",
    body: "Le stock descend à chaque vente et vous alerte avant la rupture.",
  },
  {
    icon: TrendingUp,
    title: "Rapports",
    body: "Chiffre d'affaires, bénéfices et meilleures journées, mis à jour en direct.",
  },
  {
    icon: Users,
    title: "Clients & historique",
    body: "Chaque ticket garde sa trace ; exports PDF et Excel quand il le faut.",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="scroll-mt-20 border-y bg-muted/40">
      <div className="mx-auto max-w-[1200px] space-y-9 px-4 py-16 lg:px-8">
        <motion.div className="max-w-2xl space-y-3" {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Une application, toute votre boutique.
          </h2>
          <p className="text-muted-foreground">
            Pas dix modules à apprendre. Quatre outils, ceux dont vous vous servez chaque jour.
          </p>
        </motion.div>
        {/* Bento asymétrique : la Caisse (le cœur) est la grande cellule, les trois autres
            outils s'alignent en zig-zag sous elle. Quatre tuiles identiques en rangée =
            anti-pattern (cf. DESIGN.md) ; l'asymétrie donne une hiérarchie sans surcharger. */}
        <div className="grid gap-4 lg:grid-cols-3">
          <motion.div
            className={`rounded-[2rem] border bg-card p-7 lg:col-span-2 lg:p-9 ${glowShadow}`}
            {...fadeUp}
          >
            <span className="inline-flex rounded-xl bg-primary p-3 text-primary-foreground">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-xl font-bold tracking-tight">{FEATURES[0].title}</h3>
            <p className="mt-2 max-w-[52ch] leading-relaxed text-muted-foreground">
              {FEATURES[0].body}
            </p>
            <ul className="mt-6 space-y-3 border-t pt-5">
              {[
                "La monnaie est rendue automatiquement, sans calcul mental",
                "Le ticket se ferme en deux ou trois touches, même sans réseau",
                "Chaque vente alimente les rapports à la seconde",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            className={`rounded-[1.75rem] border bg-card p-6 lg:row-span-2 ${glowShadow}`}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.07 }}
          >
            <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary ring-1 ring-primary/10">
              <Boxes className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">{FEATURES[1].title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {FEATURES[1].body}
            </p>
          </motion.div>
          <motion.div
            className={`rounded-[1.75rem] border bg-card p-6 ${glowShadow}`}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.14 }}
          >
            <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary ring-1 ring-primary/10">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">{FEATURES[2].title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {FEATURES[2].body}
            </p>
          </motion.div>
          <motion.div
            className={`rounded-[1.75rem] border bg-card p-6 ${glowShadow}`}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.21 }}
          >
            <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary ring-1 ring-primary/10">
              <Users className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">{FEATURES[3].title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {FEATURES[3].body}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
