// Page publique du produit — la seule qu'un visiteur non installé rencontre.
//
// Elle vit sur `/` alors que l'application installée démarre sur `/pos` : le manifest
// pointe `start_url` vers la caisse (cf. AGENTS.md). Un commerçant qui lance son icône ne
// doit jamais retomber sur la page marketing.
//
// Deux composants du shell se retirent d'eux-mêmes sur ce chemin — l'en-tête applicatif
// (`Header`) et l'assistant de premier lancement (`Onboarding`, dialogue BLOQUANT sans
// croix ni fermeture au clic extérieur, qui s'ouvrirait sinon par-dessus cette page pour
// chaque nouveau visiteur).
//
// Contrainte de fond : aucun asset distant. Pas de police web, pas d'image, pas de CDN.
// L'application doit rester servable hors ligne dans son intégralité, cette page comprise
// (elle figure dans PRECACHE_PAGES de public/sw.js).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Download,
  Share,
  ShoppingCart,
  ShoppingBasket,
  Beer,
  Utensils,
  Scissors,
  Shirt,
  Beef,
  Store,
  ArrowRight,
  Banknote,
  ClipboardList,
  TrendingUp,
  FileSpreadsheet,
  ArchiveRestore,
  WifiOff,
  Sparkles,
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
import { CLUSTER_MAP } from "@/lib/settings";

// Apparition commune : montée + fondu quand la section entre dans le viewport.
const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.55, ease: "easeOut" },
} as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELYNDRA CAISSE — Pilotez votre business au quotidien" },
      {
        name: "description",
        content:
          "ELYNDRA CAISSE centralise vos ventes, vos stocks et le suivi de votre activité pour vous aider à mieux piloter votre business, au quotidien.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <Hero />
      <HowItWorks />
      <ForWhom />
      <Features />
      <FinalCall />
      <Footer />
    </div>
  );
}

// ============================================================================
// En-tête
// ============================================================================

function LandingHeader() {
  return (
    <header className="bg-card/80 backdrop-blur sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <span className="inline-flex items-center gap-3 font-bold text-lg">
          <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center">
            <img src="/logo-header.png" alt="ECAISSE" className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block leading-tight">ELYNDRA CAISSE</span>
            <span className="block text-[11px] font-semibold tracking-wide text-primary/80">
              ELYNDRA TECH GABON
            </span>
          </span>
        </span>
        <span className="hidden sm:block text-sm font-medium text-muted-foreground">
          Stock · Vente · Bénéfices
        </span>
      </div>
    </header>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:pt-20 grid gap-10 lg:grid-cols-[1fr_400px] lg:items-center">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" /> Pensé pour les business gabonais
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
            Pilotez votre business,
            <br />
            <span className="text-primary">jour après jour.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            ELYNDRA CAISSE centralise vos ventes, vos stocks et le suivi de votre activité pour vous
            aider à mieux piloter votre business, au quotidien.
          </p>
          <InstallCta />
          <p className="text-sm text-muted-foreground">
            30 jours d'essai gratuit · aucune carte bancaire requise
          </p>
          <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 text-primary" />
              Fonctionne hors ligne
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              Sans connexion requise
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-center lg:justify-end"
        >
          <img
            src="/logo-body.webp"
            alt="Ely, la mascotte d'ELYNDRA CAISSE"
            className="w-full max-w-[380px] h-auto"
            width={768}
            height={1152}
          />
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Comment ça marche
// ============================================================================

const HOW_STEPS = [
  {
    number: "01",
    title: "Créez votre boutique en 2 minutes",
    body: "Nom, secteur d'activité — l'application se configure automatiquement pour votre métier.",
    illustration: "/illustrations/setup.svg",
  },
  {
    number: "02",
    title: "Chargez votre catalogue",
    body: "Ajoutez vos produits ou prestations en quelques secondes, ou utilisez les fiches de démo.",
    illustration: "/illustrations/order.svg",
  },
  {
    number: "03",
    title: "Encaissez et suivez",
    body: "Ventes, stocks, bénéfices — tout est là, automatiquement.",
    illustration: "/illustrations/payment.svg",
  },
] as const;

function HowItWorks() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <motion.div className="text-center space-y-2" {...fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight">Comment ça marche</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Trois étapes simples pour démarrer et piloter votre activité.
          </p>
        </motion.div>
        <ol className="grid gap-8 sm:grid-cols-3">
          {HOW_STEPS.map((s, i) => (
            <motion.li
              key={s.number}
              className="space-y-4 text-center"
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.12 }}
            >
              <div className="mx-auto w-full max-w-[200px]">
                <img src={s.illustration} alt="" className="w-full h-auto" aria-hidden />
              </div>
              <span className="block text-3xl font-bold tabular-nums text-primary/40">
                {s.number}
              </span>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ============================================================================
// Pour qui ?
// ============================================================================

const CLUSTER_CARDS = [
  {
    icon: ShoppingBasket,
    title: "Épicerie",
    description: "Produits du quotidien, stocks, ventes directes.",
  },
  {
    icon: Beer,
    title: "Bar / Snack",
    description: "Boissons, commandes ouvertes.",
  },
  {
    icon: Scissors,
    title: "Coiffeur",
    description: "Prestations, clients, suivi des visites.",
  },
  {
    icon: Shirt,
    title: "Boutique",
    description: "Vêtements, accessoires, variantes taille/couleur.",
  },
  {
    icon: Store,
    title: "Magasin",
    description: "Électronique, meubles, quincaillerie.",
  },
  {
    icon: Utensils,
    title: "Restaurant",
    description: "Menus, commandes, service et paiement.",
  },
  {
    icon: Beef,
    title: "Boucherie",
    description: "Vente au poids, stock en kg.",
  },
  {
    icon: Sparkles,
    title: "Personnalisé",
    description: "Votre domaine d'activité, au kilo ou à l'unité.",
  },
] as const;

function ForWhom() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 space-y-8">
      <motion.div className="text-center space-y-2" {...fadeUp}>
        <h2 className="text-2xl font-bold tracking-tight">Pour qui ?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          ELYNDRA CAISSE s'adapte à votre métier. Choisissez votre activité, l'application se
          configure automatiquement.
        </p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CLUSTER_CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            className="rounded-xl border bg-card p-5 text-center space-y-3 transition-all hover:border-primary/40 hover:shadow-sm"
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.06 }}
          >
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-primary/10">
              <c.icon className="h-6 w-6" />
            </span>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-muted-foreground">{c.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Fonctionnalités
// ============================================================================

const FEATURES = [
  {
    icon: Banknote,
    title: "Encaissez en un instant",
    body: "Sélectionnez les articles, saisissez le montant reçu, validez. La monnaie se calcule automatiquement.",
    illustration: "/illustrations/payment.svg",
  },
  {
    icon: ClipboardList,
    title: "Gérez votre stock",
    body: "Suivi automatique à chaque vente. Alertes quand le stock est bas ou vide. Prix d'achat et de vente séparés.",
    illustration: "/illustrations/stock.svg",
  },
  {
    icon: TrendingUp,
    title: "Suivez vos performances",
    body: "Chiffre d'affaires, bénéfices, marges, panier moyen. Par jour, semaine, mois ou période personnalisée.",
    illustration: "/illustrations/analytics.svg",
  },
  {
    icon: FileSpreadsheet,
    title: "Exportez vos rapports",
    body: "PDF, Excel ou CSV. Généré directement sur votre téléphone, même sans connexion.",
  },
  {
    icon: ArchiveRestore,
    title: "Sauvegardez tout",
    body: "Un fichier complet contenant toutes vos données. Restaurez-le sur un autre appareil en un clic.",
  },
  {
    icon: WifiOff,
    title: "100% hors ligne",
    body: "Aucune connexion internet nécessaire. Vos données restent sur votre appareil, sécurisées et accessibles à tout moment.",
  },
] as const;

function Features() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-16 space-y-8">
        <motion.div className="text-center space-y-2" {...fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight">Les outils qui font la différence</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tout ce dont vous avez besoin pour gérer votre activité, rien de plus.
          </p>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="rounded-xl border bg-card p-5 space-y-3 transition-all hover:border-primary/40 hover:shadow-sm"
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              >
                <span className="inline-flex rounded-lg bg-accent p-2 text-primary ring-1 ring-primary/10">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Appel final
// ============================================================================

function FinalCall() {
  return (
    <motion.section className="mx-auto max-w-2xl px-4 py-20 text-center space-y-6" {...fadeUp}>
      <h2 className="text-3xl font-bold tracking-tight">Prêt à piloter votre business ?</h2>
      <p className="text-muted-foreground">
        30 jours gratuits, sans engagement. Aucune carte bancaire requise.
        <br />
        Créez votre boutique en quelques minutes et commencez à encaisser.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <InstallCta />
      </div>
      <p className="text-xs text-muted-foreground">
        Fonctionne hors ligne · Données 100% locales · Sans abonnement
      </p>
    </motion.section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          ELYNDRA CAISSE — Développé par{" "}
          <span className="font-semibold text-foreground">ELYNDRA TECH</span>
        </span>
        <span className="flex items-center gap-4">
          <span>Vos données restent sur votre appareil.</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Fonctionne hors ligne</span>
        </span>
      </div>
    </footer>
  );
}

// ============================================================================
// Appel à l'action
// ============================================================================

function InstallCta() {
  const navigate = useNavigate();
  const { canInstall, installed, install } = usePwaInstall();
  const [help, setHelp] = useState<"ios" | "generic" | null>(null);

  if (installed) {
    return (
      <Button
        size="lg"
        className="h-14 px-8 text-base gap-2"
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
          size="lg"
          className="h-14 px-8 text-base gap-2"
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
          <Download className="h-5 w-5" />
          {canInstall ? "Installer l'application" : "Essai gratuit 1 mois"}
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 px-6 text-base gap-2">
          <Link to="/pos">
            Ouvrir la caisse
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
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
