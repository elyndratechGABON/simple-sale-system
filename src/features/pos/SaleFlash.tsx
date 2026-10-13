import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { paymentLabel } from "./pos-constants";
import type { SaleFlash as SaleFlashState } from "./usePosUiState";

/**
 * Voile « Vente validée » : son + animation, aucun bouton à cliquer — il s'efface tout
 * seul et le serveur enchaîne directement la vente suivante.
 */
export function SaleFlash({ saleFlash }: { saleFlash: SaleFlashState }) {
  return (
    <AnimatePresence>
      {saleFlash && (
        <motion.div
          key="sale-flash"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col items-center gap-4 text-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <motion.span
              className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 320, damping: 14 }}
            >
              <CheckCircle2 className="h-12 w-12" />
            </motion.span>
            <p className="text-2xl font-bold">Vente validée</p>
            <p className="text-muted-foreground tabular-nums">
              {formatFCFA(saleFlash.total)}
              {saleFlash.method === "cash"
                ? ` · Monnaie rendue ${formatFCFA(saleFlash.change)}`
                : ` · ${paymentLabel(saleFlash.method)}`}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
