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
import { Banknote, Check, Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/lib/format";

const springOvershoot = { type: "spring", stiffness: 300, damping: 12 } as const;

// ---------------------------------------------------------------------------
// Écran de la tablette tenue par Ely : la caisse réelle en miniature.
//
// Le composant remplit la boîte qu'on lui donne (positionnée sur l'écran de
// l'illustration) ; toutes les dimensions internes sont en `cqw`, donc tout
// l'écran grossit et rétrécit avec la mascotte sans jamais déborder ni
// devenir flou — c'est du vrai DOM, pas une image.
// ---------------------------------------------------------------------------

const TABLET_PRODUCTS = [
  { name: "Riz local 5 kg", price: 6500, dot: "bg-emerald-500" },
  { name: "Huile végétale 1 L", price: 1200, dot: "bg-emerald-500" },
  { name: "Sac de ciment", price: 5800, dot: "bg-amber-500" },
  { name: "Boisson glacée", price: 500, dot: "bg-emerald-500" },
  { name: "Savon de ménage", price: 350, dot: "bg-red-500" },
  { name: "Recharge solaire", price: 2500, dot: "bg-emerald-500" },
];

export function MockTabletScreen() {
  return (
    // containerType en style inline : ne dépend d'aucune utilité Tailwind.
    <div
      className="h-full w-full overflow-hidden rounded-[2cqw] bg-background"
      style={{ containerType: "inline-size" }}
    >
      <div className="flex h-full flex-col">
        {/* En-tête de l'app */}
        <div className="flex items-center justify-between px-[4cqw] pt-[3cqw] pb-[2cqw]">
          <span className="text-[6.5cqw] leading-none font-bold">Ma boutique</span>
          <span className="flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full bg-accent text-primary">
            <ShoppingBag className="h-[4.5cqw] w-[4.5cqw]" />
          </span>
        </div>
        {/* Recherche */}
        <div className="mx-[4cqw] mb-[2cqw] flex items-center gap-[2cqw] rounded-full border bg-card px-[3cqw] py-[1.6cqw] text-muted-foreground">
          <Search className="h-[3.5cqw] w-[3.5cqw]" />
          <span className="truncate text-[4.4cqw] leading-none">Chercher un article</span>
        </div>
        {/* Grille produits : pastille de couleur = état du stock, comme dans la caisse */}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-[2.2cqw] px-[4cqw]">
          {TABLET_PRODUCTS.map((p) => (
            <div key={p.name} className="min-w-0 rounded-[2.6cqw] border bg-card p-[2.4cqw]">
              <span className={cn("mb-[1.2cqw] block h-[1.8cqw] w-[1.8cqw] rounded-full", p.dot)} />
              <p className="truncate text-[4.6cqw] leading-tight font-semibold">{p.name}</p>
              <p className="text-[4.6cqw] font-bold text-primary tabular-nums">
                {formatFCFA(p.price)}
              </p>
            </div>
          ))}
        </div>
        {/* Barre de total */}
        <div className="mt-[2cqw] flex items-center justify-between border-t bg-card px-[4cqw] py-[2.2cqw]">
          <span className="text-[6cqw] font-bold tabular-nums">{formatFCFA(9700)}</span>
          <span className="inline-flex items-center gap-[1.4cqw] rounded-full bg-primary px-[3.4cqw] py-[1.6cqw] text-[4.6cqw] font-semibold text-primary-foreground">
            <Check className="h-[3.4cqw] w-[3.4cqw]" /> Valider
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pastille flottante « vente encaissée » : surgit près de la mascotte, puis s'efface
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
