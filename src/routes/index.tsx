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
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Check,
  Download,
  FileSpreadsheet,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Share,
  Smartphone,
  WifiOff,
  ShoppingBag,
  Coffee,
  Utensils,
  Scissors,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Indra Caisse — la caisse qui marche sans réseau" },
      {
        name: "description",
        content:
          "Encaissez, rendez la monnaie, suivez vos stocks et vos bénéfices depuis votre téléphone. Sans connexion, sans compte, sans abonnement.",
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
      <Proofs />
      <ForWhom />
      <Features />
      <Steps />
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
    <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <span className="flex items-center gap-2 font-bold text-lg">
          <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground text-sm">
            IC
          </span>
          <span>Indra Caisse</span>
        </span>
        <span className="hidden sm:block text-sm font-medium text-muted-foreground">
          Vente · Stock · Bénéfices
        </span>
      </div>
    </header>
  );
}

// ============================================================================
// Hero — la caisse vivante
// ============================================================================

// Les mêmes paliers que le vrai écran de vente (`QUICK_AMOUNTS` dans src/routes/pos.tsx) :
// la démo doit apprendre les gestes du produit, pas les siens.
const QUICK_AMOUNTS = [500, 1000, 2000];

const DEMO_PRODUCTS = [
  { name: "Regab", price: 500 },
  { name: "Pain", price: 200 },
  { name: "Sucrerie", price: 300 },
] as const;

/**
 * Démonstration jouable de l'écran de vente.
 *
 * ÉTAT REACT LOCAL PUR — n'écrit RIEN dans IndexedDB, volontairement. Un visiteur qui
 * joue ici ne doit pas découvrir des ventes fantômes dans son historique le jour où il
 * installe l'application. Ne pas « factoriser » avec `createSale` de src/lib/db.ts.
 */
function Hero() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cashGiven, setCashGiven] = useState("");

  const lines = useMemo(
    () =>
      DEMO_PRODUCTS.map((p) => ({ ...p, quantity: cart[p.name] ?? 0 })).filter(
        (l) => l.quantity > 0,
      ),
    [cart],
  );

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const cash = Number(cashGiven) || 0;
  const change = cash - total;
  const insufficient = cash > 0 && change < 0;
  const settled = total > 0 && cash >= total;

  const add = (name: string) => setCart((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }));
  const remove = (name: string) =>
    setCart((c) => {
      const next = (c[name] ?? 0) - 1;
      const copy = { ...c };
      if (next <= 0) delete copy[name];
      else copy[name] = next;
      return copy;
    });

  return (
    <section className="relative overflow-hidden">
      {/* Halo décoratif, purement CSS : aucune image ni police distante — la page doit
          rester servable hors ligne, cf. l'en-tête du fichier. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:pt-20 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5 text-primary" /> 100 % hors ligne · aucune connexion
            requise
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
            Votre caisse.
            <br />
            <span className="text-primary">Sans réseau.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Encaissez, rendez la monnaie juste, suivez vos stocks et vos bénéfices. Depuis votre
            téléphone, même quand la connexion tombe.
          </p>
          <InstallCta />
          <p className="text-sm text-muted-foreground">
            Gratuit · rien à créer · aucun compte
            <span className="hidden sm:inline"> · fonctionne dès l'installation</span>
          </p>
        </div>

        {/* La caisse jouable. C'est le produit lui-même, pas une capture. */}
        <div className="rounded-2xl border bg-card shadow-xl p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {DEMO_PRODUCTS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => add(p.name)}
                className="rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-accent active:scale-[0.97]"
              >
                <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                {p.name} {formatFCFA(p.price)}
              </button>
            ))}
          </div>

          <div className="min-h-[76px] space-y-2">
            {lines.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                Touchez un article pour commencer.
              </p>
            ) : (
              lines.map((l) => (
                <div key={l.name} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium">{l.name}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    aria-label={`Retirer un ${l.name}`}
                    onClick={() => remove(l.name)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center font-semibold tabular-nums">{l.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    aria-label={`Ajouter un ${l.name}`}
                    onClick={() => add(l.name)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="w-20 text-right font-semibold tabular-nums">
                    {formatFCFA(l.price * l.quantity)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {formatFCFA(total)}
            </span>
          </div>

          <div className="space-y-2">
            <label htmlFor="demo-cash" className="text-sm font-medium">
              Argent donné
            </label>
            <Input
              id="demo-cash"
              inputMode="numeric"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="h-12 text-xl text-right font-bold tabular-nums"
            />
            <div className="flex flex-wrap gap-1">
              {QUICK_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  variant="secondary"
                  size="sm"
                  onClick={() => setCashGiven(String((Number(cashGiven) || 0) + amt))}
                >
                  +{formatFCFA(amt)}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setCashGiven("")}>
                Vider
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl p-4 flex items-center justify-between",
              insufficient ? "bg-destructive/10" : "bg-accent",
            )}
          >
            <span className="font-semibold">{insufficient ? "Manque" : "À rendre"}</span>
            {/* La clé fait rejouer l'animation à chaque nouveau montant : c'est le chiffre
              que le commerçant cherche des yeux cinquante fois par jour. */}
            <motion.span
              key={change}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "text-4xl font-bold tabular-nums",
                insufficient ? "text-destructive" : "text-primary",
              )}
            >
              {formatFCFA(Math.abs(change))}
            </motion.span>
          </div>

          {/* La région live reste MONTÉE en permanence et c'est son contenu qui apparaît :
            c'est la condition pour qu'un lecteur d'écran annonce le message au bon moment.
            Masquer la phrase par `opacity-0` la laisserait dans l'arbre d'accessibilité,
            donc lue avant même qu'un calcul ait eu lieu. */}
          <p className="min-h-[1rem] text-center text-xs text-muted-foreground" aria-live="polite">
            {settled &&
              "Ce calcul vient de tourner sur votre téléphone. Rien n'est parti sur Internet."}
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Preuves
// ============================================================================

const PROOFS = [
  {
    icon: WifiOff,
    title: "Le réseau coupe, la vente passe",
    body: "L'application s'installe entièrement sur l'appareil. Elle n'appelle aucun serveur pour encaisser, calculer la monnaie ou sortir un rapport.",
  },
  {
    icon: Smartphone,
    title: "Vos chiffres restent chez vous",
    body: "Ventes et stocks sont enregistrés dans la mémoire du téléphone. Vous les exportez quand vous le décidez, vers Excel, PDF ou une sauvegarde.",
  },
  {
    icon: Check,
    title: "Aucun compte, aucun abonnement",
    body: "Pas d'inscription, pas de numéro à donner, pas de paiement mensuel. Vous installez et vous encaissez.",
  },
] as const;

function Proofs() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-12 grid gap-8 sm:grid-cols-3">
        {PROOFS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="space-y-2">
              <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="font-semibold">{p.title}</h2>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Pour qui ?
// ============================================================================

const CLUSTER_CARDS = [
  {
    icon: ShoppingBag,
    title: "Épicerie",
    description: "Gérez vos produits, stocks et ventes au quotidien.",
    emoji: "🏪",
  },
  {
    icon: Coffee,
    title: "Bar",
    description: "Consignes, tournées et suivi des boissons en temps réel.",
    emoji: "🍺",
  },
  {
    icon: Utensils,
    title: "Restaurant",
    description: "Tables, commandes et encaissement en quelques tapes.",
    emoji: "🍽️",
  },
  {
    icon: Scissors,
    title: "Coiffeur",
    description: "Prestations, clients et planning de rendez-vous.",
    emoji: "✂️",
  },
] as const;

function ForWhom() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Pour qui ?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Indra Caisse s'adapte à votre métier. Choisissez votre activité, l'application se
          configure automatiquement.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CLUSTER_CARDS.map((c) => (
          <div
            key={c.title}
            className="rounded-xl border bg-card p-5 text-center space-y-3 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              {c.emoji}
            </div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-muted-foreground">{c.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Fonctionnalités
// ============================================================================

// Nommées par ce que le commerçant fait, pas par ce que le système contient.
const FEATURES = [
  {
    icon: ShoppingCart,
    title: "Encaisser et rendre la monnaie",
    body: "Touchez vos articles, saisissez ce que le client donne, lisez la monnaie à rendre. Un article absent du catalogue se saisit à la main sans rien préparer.",
  },
  {
    icon: Package,
    title: "Suivre le stock",
    body: "Chaque vente décrémente le stock. Prix d'achat et prix de vente sont enregistrés à part, pour que le bénéfice soit réel.",
  },
  {
    icon: BarChart3,
    title: "Voir ce que vous avez gagné",
    body: "Revenus, bénéfice, marge, panier moyen, meilleur jour. Sur aujourd'hui, sur 7 jours, sur 30 jours ou sur les dates de votre choix.",
  },
  {
    icon: FileSpreadsheet,
    title: "Sortir un document",
    body: "Un rapport en PDF, un tableau en Excel ou en CSV. Généré sur l'appareil, hors ligne comme le reste.",
  },
  {
    icon: Download,
    title: "Sauvegarder et restaurer",
    body: "Un fichier de sauvegarde contient tout. Vous le rangez où vous voulez et vous le rechargez sur un autre téléphone.",
  },
] as const;

function Features() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Ce que fait l'application</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 space-y-3 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <span className="inline-flex rounded-lg bg-accent p-2 text-primary ring-1 ring-primary/10">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Étapes
// ============================================================================

// Numérotées parce que c'en est vraiment une séquence : l'ordre porte de l'information.
const STEPS = [
  {
    title: "Installez l'application",
    body: "Elle se pose sur l'écran d'accueil comme n'importe quelle autre. Quelques secondes, une seule fois.",
  },
  {
    title: "Ajoutez vos produits",
    body: "Nom, prix d'achat, prix de vente, stock. Ou sautez cette étape : on peut encaisser en saisissant les articles à la main.",
  },
  {
    title: "Encaissez",
    body: "Chaque vente alimente les stocks, l'historique et les rapports. Sans rien faire de plus.",
  },
] as const;

function Steps() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-16 space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Comment démarrer</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="space-y-2">
              <span className="block text-3xl font-bold tabular-nums text-primary/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ============================================================================
// Appel final
// ============================================================================

function FinalCall() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Installez-la maintenant</h2>
      <p className="text-muted-foreground">
        Sur Android et sur ordinateur, l'installation se fait en un bouton. Sur iPhone, ouvrez le
        menu Partager de Safari puis « Ajouter à l'écran d'accueil ».
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <InstallCta />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">
        Indra Caisse — application hors ligne. Vos données ne quittent pas votre appareil.
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
  // "ios" : marche à suivre Safari. "generic" : le navigateur n'expose aucune invite
  // (Firefox, Safari de bureau, ou Chrome qui a déjà consommé la sienne). Dans les deux
  // cas le bouton mène quelque part — un CTA qui ne fait rien serait pire que pas de CTA.
  const [help, setHelp] = useState<"ios" | "generic" | null>(null);

  if (installed) {
    return (
      <Button
        size="lg"
        className="h-14 px-8 text-base gap-2"
        onClick={() => navigate({ to: "/pos" })}
      >
        <ShoppingCart className="h-5 w-5" />
        Ouvrir la caisse
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
          Installer l'application
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 px-6 text-base">
          <Link to="/pos">{canInstall ? "Essayer d'abord" : "Ouvrir la caisse"}</Link>
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
