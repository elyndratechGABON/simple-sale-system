// Page publique du produit — la seule qu'un visiteur non installé rencontre.
//
// Elle vit sur `/` alors que l'application installée démarre sur `/pos` : le manifest
// pointe `start_url` vers la caisse (cf. AGENTS.md). Un commerçant qui lance son icône ne
// doit jamais retomber sur la page marketing.
//
// Continuité de marque : cette page est l'ANTICHAMBRE de l'application, pas une pub
// générique. Même émeraude (--primary), même or réservé aux accents premium, mêmes
// arrondis, mêmes icônes ; les maquettes d'écrans sont reconstruites en code avec les
// classes de l'app (src/components/landing/mockups.tsx) pour que « ce que je vois ici »
// soit exactement « ce que j'installe ». Palette : vert profond = confiance et sections
// sombres, vert principal = action, or = comptes Premium uniquement.
//
// Contrainte de fond inchangée : aucun asset distant. Pas de police web, pas d'image CDN.
// Tout doit rester servable hors ligne (page présente dans PRECACHE_PAGES de public/sw.js).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  Beer,
  Beef,
  Bell,
  Boxes,
  Check,
  Download,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Pencil,
  RefreshCw,
  Scale,
  Scissors,
  Share,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  Utensils,
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
import {
  MockDayChip,
  MockLiveCart,
  MockPhone,
  MockSaleToast,
  MockStockAlert,
  MockWeekBars,
} from "@/components/landing/mockups";

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
        <Problems />
        <Features />
        <ForWhom />
        <MobileFirst />
        <SimpleSteps />
        <TrustBand />
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
          <AnchorLink href="#metiers">Métiers</AnchorLink>
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

        {/* Composition téléphone : la caisse réelle, encadrée par deux chips animées */}
        <motion.div
          className="relative mx-auto flex justify-center pb-6 lg:justify-end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <MockPhone />
          <MockSaleToast />
          <MockDayChip />
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Le problème : quatre douleurs du commerce sans outil, puis la bascule
// ============================================================================

const PROBLEMS = [
  {
    icon: Boxes,
    title: "Stock difficile à suivre",
    body: "On découvre la rupture quand le client est déjà devant le comptoir.",
  },
  {
    icon: Scale,
    title: "Bénéfices flous",
    body: "Difficile de savoir combien il reste vraiment à la fin du mois.",
  },
  {
    icon: Pencil,
    title: "Ventes notées à la main",
    body: "Un cahier, un souvenir, des erreurs — et aucune trace fiable.",
  },
  {
    icon: EyeOff,
    title: "Aucune visibilité",
    body: "Impossible de dire ce qui se vend bien ni à quel moment.",
  },
];

function Problems() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-16 lg:px-8 lg:py-20">
        <motion.div className="max-w-2xl space-y-3" {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Votre business ne devrait pas être compliqué à gérer.
          </h2>
          <p className="text-muted-foreground">
            Chaque jour, des commerçants pilotent leur activité au feeling. Ce n'est pas une
            fatalité.
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              className="rounded-[1.75rem] border bg-card p-6"
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
            >
              <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary ring-1 ring-primary/10">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </motion.div>
          ))}
        </div>
        <motion.p
          className="mx-auto max-w-2xl text-center text-xl font-semibold tracking-tight sm:text-2xl"
          {...fadeUp}
        >
          ELYNDRA CAISSE rassemble tout <span className="text-primary">au même endroit.</span>
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================================
// Fonctionnalités : bento asymétrique, chaque carte vit comme l'écran réel
// ============================================================================

function Features() {
  return (
    <section id="fonctionnalites" className="scroll-mt-20">
      <div className="mx-auto max-w-[1200px] space-y-12 px-4 py-16 lg:px-8 lg:py-24">
        <motion.div className="max-w-2xl space-y-3" {...fadeUp}>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Tout est réuni
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Une application, toute votre boutique.
          </h2>
          <p className="text-muted-foreground">
            Pas dix modules à apprendre. Quatre outils, ceux dont vous vous servez chaque jour.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 md:[grid-auto-rows:1fr]">
          {/* CAISSE — grande carte */}
          <FeatureCard
            className="md:col-span-2"
            label="Caisse"
            title="Encaissez en quelques secondes."
            body="Touchez les articles, validez, rendez la monnaie — calculée automatiquement. Une vente prend moins de temps que de la noter sur un cahier."
          >
            <MockLiveCart />
          </FeatureCard>

          {/* STOCK */}
          <FeatureCard
            label="Stocks"
            title="Sachez toujours ce qu'il reste."
            body="Le stock descend à chaque vente et vous alerte avant la rupture."
          >
            <MockStockAlert />
          </FeatureCard>

          {/* RAPPORTS */}
          <FeatureCard
            label="Rapports"
            title="Comprenez votre activité en un regard."
            body="Chiffre d'affaires, bénéfices, meilleures journées — mis à jour à chaque vente."
          >
            <MockWeekBars />
          </FeatureCard>

          {/* CLIENTS & HISTORIQUE */}
          <FeatureCard
            label="Clients & historique"
            title="Chaque vente garde sa trace."
            body="Retrouvez un ticket, suivez vos habitudes clients, exportez en PDF ou Excel quand le fournisseur demande vos volumes."
          >
            <div className="space-y-2">
              {[
                { name: "Priscille Ondo", detail: "Coiffeur · hier", amount: "8 500 F" },
                { name: "Mamie Rose", detail: "Épicerie · hier", amount: "12 300 F" },
                { name: "Junior Mba", detail: "Snack · lundi", amount: "4 750 F" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                    {c.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">{c.detail}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{c.amount}</span>
                </div>
              ))}
            </div>
          </FeatureCard>

          {/* HORS LIGNE & EXPORTS — bande large */}
          <div
            className={`relative overflow-hidden rounded-[2rem] border bg-card p-6 transition-shadow md:col-span-3 md:p-8 ${glowShadow}`}
          >
            <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <WifiOff className="h-7 w-7" />
              </span>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">
                  Marche sans internet. Exporte quand vous voulez.
                </h3>
                <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                  Toutes vos données vivent sur votre appareil : coupure de courant, réseau
                  capricieux ou zone blanche, la caisse reste ouverte. La synchro reprend toute
                  seule dès que la connexion revient.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold text-primary">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1">
                    <Banknote className="h-3.5 w-3.5" /> Sauvegarde complète
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  label,
  title,
  body,
  children,
  className,
}: {
  label: string;
  title: string;
  body: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`flex flex-col gap-5 rounded-[2rem] border bg-card p-6 transition-shadow md:p-7 ${className ?? ""} ${glowShadow}`}
      {...fadeUp}
    >
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{label}</p>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </motion.div>
  );
}

// ============================================================================
// Métiers : les vrais secteurs proposés à l'onboarding — continuité garantie
// ============================================================================

const TRADES = [
  { icon: ShoppingBasket, title: "Épicerie", line: "Produits du quotidien, ventes directes." },
  { icon: Beer, title: "Bar / Snack", line: "Boissons, tables, commandes ouvertes." },
  { icon: Scissors, title: "Coiffure", line: "Prestations, clientes, fidélité." },
  { icon: Shirt, title: "Boutique", line: "Vêtements, accessoires, tailles." },
  { icon: Smartphone, title: "Téléphonie", line: "Appareils, accessoires, SAV." },
  { icon: Utensils, title: "Restaurant", line: "Menus, service, encaissement." },
  { icon: Beef, title: "Boucherie", line: "Vente au kilo, stock au poids." },
  { icon: Store, title: "Petit commerce", line: "Tout ce qui se vend au comptoir." },
];

function ForWhom() {
  return (
    <section id="metiers" className="scroll-mt-20 border-y bg-muted/40">
      <div className="mx-auto max-w-[1200px] space-y-9 px-4 py-16 lg:px-8 lg:py-20">
        <motion.div className="max-w-2xl space-y-3" {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Quel que soit votre business.
          </h2>
          <p className="text-muted-foreground">
            À l'inscription, vous choisissez votre secteur : l'application se règle pour votre
            métier, au kilo ou à l'unité.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TRADES.map((t, i) => (
            <motion.div
              key={t.title}
              className="group rounded-[1.5rem] border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
            >
              <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <t.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-semibold">{t.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{t.line}</p>
            </motion.div>
          ))}
        </div>
        <motion.p className="max-w-2xl text-center text-lg text-muted-foreground" {...fadeUp}>
          Si vous vendez un produit ou un service,{" "}
          <span className="font-semibold text-foreground">ELYNDRA CAISSE vous accompagne.</span>
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================================
// Mobile : l'app dans la poche — la mascotte Ely porte elle-même la tablette
// ============================================================================

const MOBILE_POINTS = [
  "Vendez depuis votre téléphone",
  "Gérez votre stock en direct",
  "Consultez vos rapports partout",
  "Suivez votre activité jour après jour",
  "Travaillez même avec une connexion instable",
];

function MobileFirst() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <motion.div className="order-2 space-y-7 lg:order-1" {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Votre business dans votre poche.
          </h2>
          <ul className="space-y-3.5">
            {MOBILE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
          <InstallCta />
        </motion.div>
        <motion.div
          className="order-1 flex justify-center lg:order-2"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-64px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img
            src="/splash/ely-tablette.png"
            alt="Ely, la mascotte ELYNDRA CAISSE, tenant la tablette de gestion"
            className="h-auto w-full max-w-[420px] select-none object-contain"
            draggable={false}
            width={433}
            height={577}
          />
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Simplicité : trois pas, fil d'émeraude qui les relie
// ============================================================================

const STEPS = [
  {
    number: "01",
    title: "Créez votre compte",
    body: "Nom de la boutique, secteur d'activité — deux minutes, sans document.",
    illustration: "/illustrations/setup.svg",
  },
  {
    number: "02",
    title: "Ajoutez vos produits ou services",
    body: "Nom, prix, quantité. Ou partez des fiches de démonstration pour essayer.",
    illustration: "/illustrations/order.svg",
  },
  {
    number: "03",
    title: "Commencez à vendre",
    body: "Encaissez, et laissez les stocks et les rapports se tenir tout seuls.",
    illustration: "/illustrations/payment.svg",
  },
] as const;

function SimpleSteps() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-16 lg:px-8 lg:py-20">
        <motion.div className="max-w-2xl space-y-3" {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pas besoin d'être informaticien.
          </h2>
          <p className="text-muted-foreground">
            Si vous savez utiliser WhatsApp, vous savez utiliser ELYNDRA CAISSE.
          </p>
        </motion.div>
        <ol className="relative grid gap-10 sm:grid-cols-3 sm:gap-6">
          {/* Fil d'émeraude derrière les pastilles : vertical sur mobile, horizontal au-delà.
              Il s'arrête avant la dernière étape (via les dégradés) pour garder le mouvement. */}
          <div
            aria-hidden
            className="absolute top-6 bottom-6 left-6 w-px bg-gradient-to-b from-primary via-primary/35 to-primary/10 sm:left-[calc(16.66%)] sm:top-6 sm:bottom-auto sm:h-px sm:w-[66.6%] sm:bg-gradient-to-r"
          />
          {STEPS.map((s, i) => (
            <motion.li
              key={s.number}
              className="relative flex gap-5 sm:flex-col sm:text-center"
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.12 }}
            >
              <span className="relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_10px_24px_-8px_rgba(5,150,105,0.55)]">
                {i + 1}
              </span>
              <div className="space-y-2 text-left sm:text-center">
                <span className="block text-sm font-bold tabular-nums text-primary/60">
                  {s.number}
                </span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ============================================================================
// Confiance : bande sombre, ton posé, zéro jargon technique
// ============================================================================

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Votre compte est protégé",
    body: "Vous seul décidez qui peut accéder à la boutique, vous ou les personnes autorisées.",
  },
  {
    icon: Smartphone,
    title: "Vos appareils, sous contrôle",
    body: "Vous voyez qui est connecté et pouvez retirer un téléphone perdu en un geste.",
  },
  {
    icon: RefreshCw,
    title: "Tout se synchronise tout seul",
    body: "Les ventes remontent vers votre espace dès que le réseau revient.",
  },
  {
    icon: TrendingUp,
    title: "Vos chiffres vous suivent partout",
    body: "Changez de téléphone, retrouvez votre boutique à l'identique.",
  },
  {
    icon: Bell,
    title: "Alertes utiles, rien de plus",
    body: "Stock bas, abonnement, appareil inconnu : prévenu avant que ça bloque.",
  },
];

function TrustBand() {
  return (
    <section className="bg-gradient-to-b from-[#03231a] via-[#04301f] to-[#053f28] text-emerald-50">
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-16 lg:px-8 lg:py-24">
        <motion.div className="max-w-2xl space-y-3" {...fadeUp}>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#d4af37]">Confiance</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Vos données, votre business.
          </h2>
          <p className="leading-relaxed text-emerald-100/75">
            Elles restent chez vous, elles vous ressemblent, personne d'autre ne les touche.
          </p>
        </motion.div>
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_ITEMS.map((t, i) => (
            <motion.div
              key={t.title}
              className="flex gap-4"
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-emerald-300 ring-1 ring-white/10">
                <t.icon className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-sm leading-relaxed text-emerald-100/65">{t.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Tarification : les trois offres réelles ; l'or signale le Premium
// ============================================================================

const PLANS = [
  {
    name: "Essentiel",
    price: 10000,
    devices: "2 appareils",
    note: "Pour démarrer proprement.",
    premium: false,
    featured: false,
  },
  {
    name: "Business",
    price: 25000,
    devices: "4 appareils",
    note: "Le choix des boutiques qui grandissent.",
    premium: false,
    featured: true,
  },
  {
    name: "Premium",
    price: 50000,
    devices: "8 appareils",
    note: "Toute l'équipe connectée, sans limite d'usage.",
    premium: true,
    featured: false,
  },
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
            Trois offres, une logique : payez selon la taille de votre équipe. Chaque offre couvre
            une période d'abonnement complète.
          </p>
        </motion.div>

        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={[
                "relative flex flex-col rounded-[2rem] border bg-card p-7 transition-shadow",
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
              <div className="space-y-1.5">
                <h3
                  className={
                    plan.premium
                      ? "text-lg font-bold tracking-tight text-[#8a6d1f]"
                      : "text-lg font-bold tracking-tight"
                  }
                >
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">{plan.note}</p>
              </div>
              <p className="mt-5 flex items-baseline gap-1.5">
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
              <ul className="mt-6 space-y-2.5 border-t pt-5">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={
                        plan.premium
                          ? "mt-0.5 h-4 w-4 shrink-0 text-[#b8912a]"
                          : "mt-0.5 h-4 w-4 shrink-0 text-primary"
                      }
                    />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div className="flex flex-col items-center gap-3" {...fadeUp}>
          <InstallCta label="Commencer avec ELYNDRA CAISSE" />
          <p className="text-xs text-muted-foreground">
            30 jours d'essai offerts sur toutes les offres · sans engagement
          </p>
        </motion.div>
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
          <a href="#metiers" className="text-muted-foreground hover:text-primary">
            Métiers
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
          {label ?? (canInstall ? "Installer l'application" : "Commencer maintenant")}
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
