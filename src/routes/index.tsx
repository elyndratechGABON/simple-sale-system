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
  Share,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
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
import { MockSaleToast, MockTabletScreen } from "@/components/landing/mockups";

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

        {/* Ely porte elle-même la boutique : l'écran de sa tablette diffuse la caisse
            réelle (MockTabletScreen, positionné sur l'écran repéré dans l'illustration). */}
        <motion.div
          className="relative mx-auto flex w-full max-w-[520px] items-end justify-center pb-6 lg:max-w-none lg:justify-end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <div className="relative w-full max-w-[330px] lg:w-[78%] lg:max-w-[430px]">
            <img
              src="/splash/ely-tablette.png"
              alt="Ely, la mascotte ELYNDRA CAISSE, tenant la tablette qui affiche la caisse"
              className="w-full select-none object-contain"
              draggable={false}
              width={433}
              height={577}
            />
            {/* Écran de la tablette : coordonnées en % de l'illustration (433×577). */}
            <div className="absolute top-[37%] left-[36.5%] h-[20.5%] w-[31.8%]">
              <MockTabletScreen />
            </div>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className={`rounded-[1.75rem] border bg-card p-6 ${glowShadow}`}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
            >
              <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary ring-1 ring-primary/10">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
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

const PLANS = [
  { name: "Essentiel", price: 10000, devices: "2 appareils", premium: false, featured: false },
  { name: "Business", price: 25000, devices: "4 appareils", premium: false, featured: true },
  { name: "Premium", price: 50000, devices: "8 appareils", premium: true, featured: false },
] as const;

const PLAN_FEATURES = [
  "Caisse rapide, monnaie automatique",
  "Stocks avec alertes de rupture",
  "Rapports : revenus, bénéfices, marges",
  "Historique clients complet",
  "Exports PDF, Excel et sauvegarde",
  "Fonctionne hors ligne",
];

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
            <motion.div
              key={plan.name}
              className={[
                "relative flex flex-col items-center justify-center rounded-[2rem] border bg-card p-8 text-center transition-shadow",
                glowShadow,
                plan.premium
                  ? "border-[#d4af37]/60 shadow-[0_28px_70px_-30px_rgba(212,175,55,0.45)]"
                  : "",
                plan.featured ? "ring-2 ring-primary/60" : "",
              ].join(" ")}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
            >
              {plan.featured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold whitespace-nowrap text-primary-foreground">
                  Le plus choisi
                </span>
              )}
              {plan.premium && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#d4af37] px-4 py-1 text-xs font-bold whitespace-nowrap text-[#231a02]">
                  ★ Premium
                </span>
              )}
              <h3
                className={
                  plan.premium
                    ? "text-lg font-bold tracking-tight text-[#8a6d1f]"
                    : "text-lg font-bold tracking-tight"
                }
              >
                {plan.name}
              </h3>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span
                  className={
                    plan.premium
                      ? "text-4xl font-bold tracking-tight text-[#a8842a] tabular-nums"
                      : "text-4xl font-bold tracking-tight tabular-nums"
                  }
                >
                  {new Intl.NumberFormat("fr-FR").format(plan.price)}
                </span>
                <span className="text-lg font-semibold text-muted-foreground">F</span>
                <span className="text-sm text-muted-foreground">/ période</span>
              </p>
              <p className="mt-1 text-sm font-medium text-primary">{plan.devices}</p>
            </motion.div>
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
  const { canInstall, installed, install } = usePwaInstall();
  const [help, setHelp] = useState<"ios" | "generic" | null>(null);

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
              setHelp("generic");
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
              <Share className="h-5 w-5" /> Ajouter à l'écran d'accueil
            </DialogTitle>
            <DialogDescription asChild>
              {help === "ios" ? (
                <ol className="mt-2 space-y-2 text-left text-sm">
                  <li>1. Touchez le bouton Partager, en bas de Safari.</li>
                  <li>2. Faites défiler puis choisissez « Ajouter à l'écran d'accueil ».</li>
                  <li>3. Confirmez avec « Ajouter ».</li>
                </ol>
              ) : (
                <div className="mt-2 space-y-2 text-left text-sm">
                  <p>
                    Ce navigateur ne propose pas de bouton d'installation. Ouvrez son menu, puis
                    choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».
                  </p>
                  <p>
                    L'application fonctionne aussi telle quelle dans l'onglet : tout est déjà
                    enregistré sur cet appareil.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
