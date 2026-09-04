// Page publique du produit — la seule qu'un visiteur non installé rencontre.
//
// Elle vit sur `/` alors que l'application installée démarre sur `/pos` : le manifest
// pointe `start_url` vers la caisse (cf. AGENTS.md). Un commerçant qui lance son icône ne
// doit jamais retomber sur la page marketing.
//
// Continuité de marque : cette page est l'ANTICHAMBRE de l'application, pas une pub
// générique. Même émeraude (--primary), même or réservé aux accents premium, mêmes
// arrondis, mêmes icônes ; la maquette du hero est reconstruite en code avec les classes
// de l'app (src/components/landing/mockups.tsx) pour que « ce que je vois ici »
// soit exactement « ce que j'installe ». Palette : vert profond = confiance, or = comptes
// Premium uniquement.
//
// Volontairement COURTE : promesse (hero), ce que fait l'app (quatre puces), prix,
// inscription. Rien d'autre.
//
// Contrainte de fond inchangée : aucun asset distant. Pas de police web, pas d'image CDN.
// Tout doit rester servable hors ligne (page présente dans PRECACHE_PAGES de public/sw.js).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Check,
  Download,
  Monitor,
  Share,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  WifiOff,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MockSaleToast } from "@/components/landing/mockups";
import { PLANS, type PlanInfo } from "@/lib/pricing";

// Apparition commune : montée + fondu quand la section entre dans le viewport.
const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.55, ease: "easeOut" },
} as const;

// Ombre de diffusion teintée vers le vert du fond (jamais de noir pur).
const glowShadow =
  "shadow-[0_24px_70px_-28px_rgba(4,41,30,0.35)] hover:shadow-[0_32px_80px_-28px_rgba(5,150,105,0.35)]";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELYNDRA CAISSE — Gérez votre business. Vendez plus simplement." },
      {
        name: "description",
        content:
          "Caisse, stocks, clients et rapports : ELYNDRA CAISSE réunit toute votre boutique dans une seule application, utilisable même sans internet.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FinalCall />
      </main>
      <Footer />
    </div>
  );
}

// ============================================================================
// En-tête : marque + ancres de section, CTA d'installation à droite
// ============================================================================

function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-card/85 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo-header.png" alt="ELYNDRA CAISSE" className="h-14 w-14 object-contain" />
          <span>
            <span className="block text-base font-bold leading-tight">ELYNDRA CAISSE</span>
            <span className="block text-[11px] font-semibold tracking-wide text-primary/80">
              ELYNDRA TECH GABON
            </span>
          </span>
        </Link>
        <nav aria-label="Sections de la page" className="hidden items-center gap-7 lg:flex">
          <AnchorLink href="#fonctionnalites">Fonctionnalités</AnchorLink>
          <AnchorLink href="#tarifs">Tarifs</AnchorLink>
        </nav>
        <div className="hidden sm:block">
          <InstallCta compact />
        </div>
      </div>
    </header>
  );
}

function AnchorLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
    </a>
  );
}

// ============================================================================
// Hero : promesse à gauche, téléphone vivant à droite
// ============================================================================

function Hero() {
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
              30 jours d'essai gratuit · aucune carte bancaire requise
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
              src="/logo-body.png"
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

function Features() {
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

function Pricing() {
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
          30 jours d'essai offerts sur toutes les offres · sans engagement
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================================
// Appel final
// ============================================================================

function FinalCall() {
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

function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo-header.png" alt="" className="h-12 w-12 object-contain" />
          <div>
            <p className="font-bold">ELYNDRA CAISSE</p>
            <p className="text-sm text-muted-foreground">
              La gestion de votre business, simplement.
            </p>
          </div>
        </div>
        <nav aria-label="Liens du site" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="#fonctionnalites" className="text-muted-foreground hover:text-primary">
            Fonctionnalités
          </a>
          <a href="#tarifs" className="text-muted-foreground hover:text-primary">
            Tarifs
          </a>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ELYNDRA TECH Gabon
        </p>
      </div>
    </footer>
  );
}

// ============================================================================
// Appel à l'action — NE PAS MODIFIER L'ORDRE : Safari construit le raccourci iOS
// depuis la page OUVERTE, donc on navigue vers /pos AVANT d'afficher les étapes.
// ============================================================================

function InstallCta({ compact = false, label }: { compact?: boolean; label?: string }) {
  const navigate = useNavigate();
  const { canInstall, installed, isIos, platform, insecure, install } = usePwaInstall();
  // Repli ORCHESTRÉ : chaque cas a SON explication et SA marche à suivre — plus
  // aucun message générique du type « ce navigateur ne propose pas… ».
  const [help, setHelp] = useState<"ios" | "insecure" | "android-menu" | "desktop-menu" | null>(
    null,
  );

  if (installed) {
    return (
      <Button
        size={compact ? "default" : "lg"}
        className={`${compact ? "h-10 px-5" : "h-14 px-8"} text-base gap-2`}
        onClick={() => navigate({ to: "/pos" })}
      >
        <ShoppingCart className="h-5 w-5" />
        Ouvrir ELYNDRA CAISSE
      </Button>
    );
  }

  function routeFallback() {
    // Ordre de diagnostic : contexte d'abord (cause racine), plateforme ensuite.
    if (insecure) setHelp("insecure");
    else if (isIos || platform === "ios") setHelp("ios");
    else if (platform === "android") setHelp("android-menu");
    else setHelp("desktop-menu");
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          size={compact ? "default" : "lg"}
          className={`${compact ? "h-10 px-5" : "h-14 px-8"} text-base gap-2`}
          onClick={async () => {
            const outcome = await install();
            if (outcome === "accepted" || outcome === "dismissed") return;
            if (outcome === "unavailable") {
              routeFallback();
              return;
            }
            // Safari construit le raccourci « Ajouter à l'écran d'accueil » à partir de la
            // page OUVERTE à cet instant, pas à partir du `start_url` du manifest. Suivre
            // les instructions depuis cette page produirait donc une icône qui rouvre la
            // page de présentation. On amène l'utilisateur sur la caisse AVANT d'expliquer
            // la manipulation. Ne pas inverser cet ordre.
            await navigate({ to: "/pos" });
            setHelp("ios");
          }}
        >
          <Download className={compact ? "h-4 w-4" : "h-5 w-5"} />
          {label ?? "Installer l'application"}
        </Button>
        {!compact && (
          <Button asChild size="lg" variant="outline" className="h-14 px-6 text-base gap-2">
            <a href="#fonctionnalites">
              Découvrir l'application
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <Dialog open={help !== null} onOpenChange={(v) => !v && setHelp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {help === "insecure" ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-500" /> Connexion non sécurisée
                </>
              ) : help === "desktop-menu" ? (
                <>
                  <Monitor className="h-5 w-5" /> Installer sur votre ordinateur
                </>
              ) : help === "android-menu" ? (
                <>
                  <Smartphone className="h-5 w-5" /> Installation sur Android
                </>
              ) : (
                <>
                  <Share className="h-5 w-5" /> Ajouter à l'écran d'accueil
                </>
              )}
            </DialogTitle>
            <DialogDescription asChild>
              {help === "insecure" ? (
                <div className="mt-2 space-y-2 text-left text-sm">
                  <p>
                    Vous ouvrez l'application en <b>http</b> sur une adresse locale : les
                    navigateurs n'y proposent jamais l'installation.
                  </p>
                  <p>
                    Ouvrez l'adresse <b>https://</b> de l'application (ou passez par une caisse déjà
                    installée), puis revenez : le bouton déclenchera l'installation native.
                  </p>
                  <p>
                    En attendant, tout fonctionne dans cet onglet et reste enregistré sur cet
                    appareil.
                  </p>
                </div>
              ) : help === "android-menu" ? (
                <ol className="mt-2 space-y-2 text-left text-sm">
                  <li>1. Ouvrez le menu ⋮ du navigateur, en haut à droite.</li>
                  <li>
                    2. Choisissez « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
                  </li>
                  <li>3. Confirmez : l'icône rejoint votre écran d'accueil.</li>
                </ol>
              ) : help === "desktop-menu" ? (
                <div className="mt-2 space-y-2 text-left text-sm">
                  <p>
                    Cliquez l'icône d'installation dans la barre d'adresse (écran ou ⊕), puis
                    confirmez.
                  </p>
                  <p>
                    Sinon : menu du navigateur → « Installer ELYNDRA CAISSE » (Edge : ⋯ →
                    Applications).
                  </p>
                </div>
              ) : (
                <ol className="mt-2 space-y-2 text-left text-sm">
                  <li>1. Touchez le bouton Partager, en bas de Safari.</li>
                  <li>2. Faites défiler puis choisissez « Ajouter à l'écran d'accueil ».</li>
                  <li>3. Confirmez avec « Ajouter ».</li>
                </ol>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
