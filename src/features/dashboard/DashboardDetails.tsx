import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleItemChips } from "@/components/SaleItemChips";
import { formatFCFA, formatKg, formatRelative } from "@/lib/format";
import { WeekPerformanceCard } from "./WeekPerformanceCard";
import type { DashboardData } from "./useDashboardData";

export function DashboardDetails({ data }: { data: DashboardData }) {
  const { isService, hasWeightInput, weightSales, topProducts, recentSales } = data;

  return (
    /* Détail — perf, top produits, locations, boucherie, activité récente.
       Réservé aux écrans moyens et grands (>= md) : sur mobile l'accueil doit
       tenir à l'écran sans scroll, motion d'app native. La « détection
       d'écran » est assurée par les breakpoints CSS (pas de JavaScript). */
    <div className="hidden md:block">
      <div className="grid gap-4 lg:grid-cols-2">
        <WeekPerformanceCard data={data} />

        {topProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.55 }}
          >
            <div className="flat-card">
              <div className="px-4 py-3 divide-x divide-border">
                <p className="text-title font-semibold">
                  Top {isService ? "prestations" : "produits"} — 7 jours
                </p>
              </div>
              <div className="space-y-1 p-2">
                {topProducts.map((product, index) => (
                  <div
                    key={`${product.name}-${index}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body font-medium">
                      {product.name}
                    </span>
                    <span className="shrink-0 text-small text-muted-foreground tabular-nums">
                      {product.quantity} {isService ? "prestations" : "ventes"}
                    </span>
                    <span className="w-24 shrink-0 text-right text-body font-semibold tabular-nums">
                      {formatFCFA(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {hasWeightInput && weightSales && weightSales.weightKg > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.65 }}
        >
          <div className="flat-card">
            <div className="px-4 py-3 divide-x divide-border">
              <p className="text-title font-semibold">Boucherie — 14 jours</p>
            </div>
            <div className="grid grid-cols-3 gap-3 divide-x divide-border p-4">
              <div>
                <p className="text-small text-muted-foreground">Vendu au poids</p>
                <p className="mt-0.5 truncate text-title font-semibold tabular-nums">
                  {formatKg(weightSales.weightKg)}
                </p>
              </div>
              <div>
                <p className="text-small text-muted-foreground">Poids moyen / pesée</p>
                <p className="mt-0.5 truncate text-title font-semibold tabular-nums">
                  {formatKg(weightSales.avgWeightKg)}
                </p>
              </div>
              <div>
                <p className="text-small text-muted-foreground">Chiffre d'affaires</p>
                <p className="mt-0.5 truncate text-title font-semibold tabular-nums">
                  {formatFCFA(weightSales.revenue)}
                </p>
              </div>
            </div>
            {weightSales.byProduct.length > 0 && (
              <div className="space-y-1 p-2">
                {weightSales.byProduct.slice(0, 3).map((product, index) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body font-medium">
                      {product.name}
                    </span>
                    <span className="shrink-0 text-small text-muted-foreground tabular-nums">
                      {formatKg(product.weightKg)} vendus
                    </span>
                    <span className="w-24 shrink-0 text-right text-body font-semibold tabular-nums">
                      {formatFCFA(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {recentSales.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.65 }}
        >
          <div className="flat-card">
            <div className="flex items-center justify-between divide-x divide-border px-4 py-3">
              <p className="text-title font-semibold">Activité récente</p>
              <span className="text-small text-muted-foreground">
                {recentSales.length} vente{recentSales.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-0.5 p-2">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <SaleItemChips items={sale.items} className="min-w-0" />
                    <p className="mt-0.5 text-small text-muted-foreground">
                      {formatRelative(sale.timestamp)}
                    </p>
                  </div>
                  <span className="shrink-0 text-body font-semibold tabular-nums">
                    {formatFCFA(sale.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="divide-x divide-border p-2">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/history" className="flex items-center justify-center gap-2">
                  Voir tout l'historique
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
