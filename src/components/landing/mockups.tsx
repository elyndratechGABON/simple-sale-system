// Maquettes animées du site marketing (`/`).
//
// Pourquoi du code et pas des captures d'écran : la continuité visuelle promise aux
// visiteurs (« ce que vous voyez ici est ce que vous installerez ») tient par les
// composants mêmes de l'application — mêmes arrondis, mêmes couleurs de stock, même
// barre de total. Une capture vieillit ; ces maquettes sont branchées sur les mêmes
// classes que la caisse réelle.
//
// Règles de performance : chaque boucle perpétuelle vit dans son propre composant
// mémoïsé, nettoie son intervalle, n'anime que transform/opacity, et se fige quand
// `prefers-reduced-motion` est actif.
import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Banknote, Check, Minus, Plus, Search, ShoppingBag, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/lib/format";

const springSmooth = { type: "spring", stiffness: 100, damping: 20 } as const;
const springOvershoot = { type: "spring", stiffness: 300, damping: 12 } as const;

// ---------------------------------------------------------------------------
// Téléphone : cadre + écran caisse fidèle à /pos (cartes produits, total, CTA)
// ---------------------------------------------------------------------------

const PHONE_PRODUCTS = [
  { name: "Riz local 5 kg", price: 6500, dot: "bg-emerald-500" },
  { name: "Huile végétale 1 L", price: 1200, dot: "bg-emerald-500" },
  { name: "Sac de ciment", price: 5800, dot: "bg-amber-500" },
  { name: "Boisson glacée", price: 500, dot: "bg-emerald-500" },
  { name: "Savon de ménage", price: 350, dot: "bg-red-500" },
  { name: "Recharge solaire", price: 2500, dot: "bg-emerald-500" },
];

export const MockPhone = memo(function MockPhone() {
  return (
    <div className="relative w-[270px] shrink-0 rounded-[2.6rem] border border-[#20291f]/15 bg-[#141b14] p-2 shadow-[0_40px_80px_-32px_rgba(4,41,30,0.45)]">
      <div className="overflow-hidden rounded-[2.1rem] bg-background">
        {/* En-tête de l'app */}
        <div className="space-y-2 px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Ma boutique</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-primary">
              <ShoppingBag className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
            <Search className="h-3 w-3" />
            <span className="text-[11px]">Chercher un article</span>
          </div>
        </div>
        {/* Grille produits : pastille de couleur = état du stock, comme dans la caisse */}
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          {PHONE_PRODUCTS.map((p) => (
            <div key={p.name} className="rounded-xl border bg-card p-2.5 text-left">
              <span className={cn("mb-1.5 block h-1.5 w-1.5 rounded-full", p.dot)} />
              <p className="truncate text-[11px] font-semibold leading-tight">{p.name}</p>
              <p className="text-[11px] font-bold text-primary tabular-nums">
                {formatFCFA(p.price)}
              </p>
            </div>
          ))}
        </div>
        {/* Barre de total */}
        <div className="flex items-center justify-between border-t bg-card px-4 py-3">
          <span className="text-sm font-bold tabular-nums">{formatFCFA(9700)}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
            <Check className="h-3 w-3" /> Valider
          </span>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Panier vivant : des lignes défilent, le total grimpe — comme un vrai service
// ---------------------------------------------------------------------------

const SALE_POOL = [
  { name: "Attiéké poisson", qty: 1, amount: 1500 },
  { name: "Jus de bissap", qty: 2, amount: 1000 },
  { name: "Poulet braisé", qty: 1, amount: 3500 },
  { name: "Beignets ×4", qty: 1, amount: 500 },
  { name: "Eau 1,5 L", qty: 3, amount: 900 },
  { name: "Café Touba", qty: 2, amount: 600 },
];

export const MockLiveCart = memo(function MockLiveCart() {
  const reduceMotion = useReducedMotion();
  // Séquence déterministe (index qui avance) : aucun aléa au rendu, aucune dérive.
  const [cursor, setCursor] = useState(3);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setCursor((c) => c + 1), 2400);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const take = (offset: number) => SALE_POOL[(cursor + offset) % SALE_POOL.length];
  const visible = [take(0), take(1), take(2)];
  const total = visible.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((l, i) => (
            <motion.div
              key={`${cursor}-${i}`}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={springSmooth}
              className="flex items-center gap-3 rounded-xl bg-accent/50 px-3 py-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-card">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="flex-1 truncate text-sm font-medium">{l.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">×{l.qty}</span>
              <span className="text-sm font-semibold tabular-nums">{formatFCFA(l.amount)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <motion.span
          key={total}
          initial={{ scale: 0.92, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSmooth}
          className="text-xl font-bold text-primary tabular-nums"
        >
          {formatFCFA(total)}
        </motion.span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Stock : une référence s'épuise, l'alerte surgit, le réapprovisionnement suit
// ---------------------------------------------------------------------------

const STOCK_STAGES = [
  { level: 34, alert: false },
  { level: 22, alert: false },
  { level: 9, alert: false },
  { level: 3, alert: true },
  { level: 28, alert: false },
] as const;

export const MockStockAlert = memo(function MockStockAlert() {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setStage((s) => (s + 1) % STOCK_STAGES.length), 1900);
    return () => clearInterval(id);
  }, [reduceMotion]);
  const { level, alert } = STOCK_STAGES[stage];

  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">Huile végétale 1 L</span>
        <AnimatePresence>
          {alert && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={springOvershoot}
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700"
            >
              <TriangleAlert className="h-3 w-3" /> Stock bas
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {/* Jauge : scaleX uniquement (jamais width), origine à gauche */}
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            "h-full origin-left rounded-full",
            alert ? "bg-red-500" : level < 15 ? "bg-amber-500" : "bg-emerald-500",
          )}
          animate={{ scaleX: level / 34 }}
          transition={springSmooth}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums">{level} unités en rayon</span>
        <span className="tabular-nums">Seuil : 5</span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Rapports : barres hebdomadaires révélées à l'entrée, jour record mis en avant
// ---------------------------------------------------------------------------

const WEEK_BARS = [
  { day: "L", pct: 52, top: false },
  { day: "M", pct: 71, top: false },
  { day: "M", pct: 44, top: false },
  { day: "J", pct: 88, top: true },
  { day: "V", pct: 63, top: false },
  { day: "S", pct: 96, top: true },
  { day: "D", pct: 38, top: false },
] as const;

export const MockWeekBars = memo(function MockWeekBars() {
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex h-28 items-end justify-between gap-2">
        {WEEK_BARS.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              className={cn("w-full rounded-t-md", b.top ? "bg-primary" : "bg-primary/25")}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: b.pct / 100 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ ...springSmooth, delay: i * 0.07 }}
              style={{ height: `${b.pct}%`, transformOrigin: "bottom" }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">{b.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">Semaine en cours</span>
        <span className="text-lg font-bold text-primary tabular-nums">{formatFCFA(187450)}</span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Pastille flottante « vente encaissée » : surgit près du téléphone, puis s'efface
// ---------------------------------------------------------------------------

export const MockSaleToast = memo(function MockSaleToast() {
  const reduceMotion = useReducedMotion();
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setOn((v) => !v), 3600);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <AnimatePresence>
      {on && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={springOvershoot}
          className="absolute -right-3 top-16 inline-flex items-center gap-2 rounded-full border bg-card py-2 pl-2 pr-4 shadow-[0_16px_40px_-16px_rgba(4,41,30,0.35)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Banknote className="h-4 w-4" />
          </span>
          <span className="text-xs">
            <span className="block font-bold leading-tight tabular-nums">+{formatFCFA(12450)}</span>
            <span className="block text-muted-foreground leading-tight">Vente encaissée</span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ---------------------------------------------------------------------------
// Mini carte tableau de bord (chip flottant côté gauche du téléphone)
// ---------------------------------------------------------------------------

export const MockDayChip = memo(function MockDayChip() {
  return (
    <div className="absolute -left-6 bottom-14 rounded-2xl border bg-card p-3.5 shadow-[0_16px_40px_-16px_rgba(4,41,30,0.35)]">
      <p className="text-[11px] font-medium text-muted-foreground">Aujourd'hui</p>
      <p className="text-lg font-bold tabular-nums">{formatFCFA(87300)}</p>
      <div className="mt-1.5 flex items-end gap-1">
        {[38, 62, 45, 80, 58, 92, 66].map((h, i) => (
          <span
            key={i}
            className={cn("w-1.5 rounded-sm", i === 5 ? "bg-primary" : "bg-primary/25")}
            style={{ height: `${h * 0.28}px` }}
          />
        ))}
      </div>
    </div>
  );
});

// Quantités panier factices pour l'illustration statique (variante réduite au mouvement)
export function MockCartStatic() {
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-xl bg-accent/50 px-3 py-2">
        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-medium">Poulet braisé</span>
        <span className="text-sm font-semibold tabular-nums">{formatFCFA(3500)}</span>
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-xl font-bold text-primary tabular-nums">{formatFCFA(3500)}</span>
      </div>
    </div>
  );
}
