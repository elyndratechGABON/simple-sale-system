// Ligne du panier. MAINTENIR la ligne ≈600 ms la retire d'un coup : teinte rouge et
// barre de remplissage pendant l'appui, vibration légère à l'expiration. Relâcher,
// sortir du doigt ou faire défiler la liste (pointercancel) annule le geste — il ne
// part jamais par accident pendant que le panier glisse. Les boutons −/+/poubelle
// restent en place pour les corrections fines.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UiLine } from "@/lib/pos/types";

type PosLineProps = {
  line: UiLine;
  isService: boolean;
  onRemoveOne: (line: UiLine) => void;
  onAddOne: (line: UiLine) => void;
  onRemove: (line: UiLine) => void;
};

export function PosLine({ line, isService, onRemoveOne, onAddOne, onRemove }: PosLineProps) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const cancel = () => {
    setHolding(false);
    window.clearTimeout(timer.current);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "relative flex items-center gap-2 -mx-1 px-1 rounded-lg select-none transition-colors",
        holding ? "bg-destructive/10" : "bg-transparent",
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        setHolding(true);
        timer.current = window.setTimeout(() => {
          navigator.vibrate?.(35);
          onRemove(line);
          setHolding(false);
        }, 600);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Barre de progression du maintien : elle ne court que pendant l'appui. */}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-0 left-0 h-0.5 rounded-full bg-destructive transition-[width]",
          holding ? "w-full duration-[600ms] ease-linear" : "w-0 duration-150",
        )}
      />
      <div className="flex-1 min-w-0 pointer-events-none">
        <div className="font-medium truncate flex items-center gap-1.5">
          {line.name}
          {isService && line.productType && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                line.productType === "service"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              )}
            >
              {line.productType === "service" ? "P" : "Pr"}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatFCFA(line.price)} × {line.quantity}
        </div>
      </div>
      {/* `shrink-0` : à 320px, c'est le NOM qui tronque — jamais les cibles 44px
          des steppers, que le flex comprimerait sinon sous le minimum tactile. */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11"
          onClick={() => onRemoveOne(line)}
          aria-label="Retirer un exemplaire"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-6 text-center font-semibold">{line.quantity}</span>
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11"
          onClick={() => onAddOne(line)}
          aria-label="Ajouter un exemplaire"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11"
          onClick={() => onRemove(line)}
          aria-label="Supprimer la ligne"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {/* `min-w-20 shrink-0` au lieu de `w-20` figé : un montant long
          (« 1 250 000 F », espaces insécables) garde sa colonne sans déborder. */}
      <div className="min-w-20 shrink-0 text-right font-semibold">
        {formatFCFA(line.price * line.quantity)}
      </div>
    </motion.div>
  );
}
