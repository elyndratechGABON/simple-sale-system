import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  History,
  BarChart3,
  Wallet,
  Package,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/Card";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFCFA } from "@/lib/format";
import { AnimatedCounter } from "./AnimatedCounter";
import type { DashboardData } from "./useDashboardData";

type QuickAction = {
  label: string;
  icon: LucideIcon;
  to: "/pos" | "/stocks" | "/history" | "/reports";
};

export function DashboardOverview({ data }: { data: DashboardData }) {
  const { todayRev, todaySalesCount, todayCustomers, avgPanier, catalogueEmpty, isService } = data;
  const quickActions: QuickAction[] = [
    { label: "Nouvelle vente", icon: ShoppingCart, to: "/pos" },
    isService
      ? { label: "Nouvelle prestation", icon: Plus, to: "/stocks" }
      : { label: "Nouveau produit", icon: Plus, to: "/stocks" },
    { label: "Historique", icon: History, to: "/history" },
    { label: "Rapports", icon: BarChart3, to: "/reports" },
  ];

  return (
    <>
      {/* Synthèse de l'activité — LE bloc financier principal */}
      {data.isLoading ? (
        <div className="flat-card space-y-5" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      ) : (
        <div className="flat-card bg-primary text-primary-foreground">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-small font-medium text-primary-foreground/90">
                Synthèse de l'activité
              </p>
              <div className="text-display tracking-tight text-primary-foreground tabular-nums">
                <AnimatedCounter value={todayRev} format={formatFCFA} />
              </div>
              <p className="text-small text-primary-foreground/80">Solde aujourd'hui • encaissé</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 divide-x divide-white/20 pt-4">
            <div className="px-2 py-3 text-center min-w-0">
              <span className="block text-small truncate text-primary-foreground/90">Ventes</span>
              <span className="mt-1 block text-title font-bold text-primary-foreground tabular-nums">
                <AnimatedCounter value={todaySalesCount} format={(n) => String(n)} />
              </span>
            </div>
            <div className="px-2 py-3 text-center min-w-0">
              <span className="block text-small truncate text-primary-foreground/90">Clients</span>
              <span className="mt-1 block text-title font-bold text-primary-foreground tabular-nums">
                <AnimatedCounter value={todayCustomers ?? 0} format={(n) => String(n)} />
              </span>
            </div>
            <div className="px-2 py-3 text-center min-w-0">
              <span className="block text-small truncate text-primary-foreground/90">
                Panier moyen
              </span>
              <span className="mt-1 block text-title font-bold text-primary-foreground tabular-nums">
                <AnimatedCounter value={avgPanier ?? 0} format={formatFCFA} />
              </span>
            </div>
          </div>
        </div>
      )}

      {catalogueEmpty && !data.isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="flat-card text-center space-y-4 p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-title font-medium">
                {isService ? "Créez votre première prestation" : "Créez votre premier produit"}
              </p>
              <p className="text-small mt-1">
                Ajoutez vos articles au catalogue pour commencer à encaisser.
              </p>
            </div>
            <Button asChild>
              <Link to="/stocks" className="flex items-center justify-center gap-2">
                Aller aux stocks
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {quickActions.map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-3 text-center transition-colors hover:bg-primary/10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="text-small font-medium leading-tight truncate text-foreground">
              {label}
            </span>
          </Link>
        ))}
      </motion.div>
    </>
  );
}
