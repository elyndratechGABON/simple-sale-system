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
      <Card variant="primary" className="p-5 shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-100/80">
              Synthèse de l'activité
            </p>
            <div className="text-3xl font-black tracking-tighter text-white sm:text-5xl tabular-nums">
              <AnimatedCounter value={todayRev} format={formatFCFA} />
            </div>
            <p className="text-[10px] font-medium text-emerald-200/70">
              SOLDE AUJOURD'HUI • ENCAISSÉ
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
            <Wallet className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 sm:mt-8 sm:gap-4 sm:pt-6">
          <div className="rounded-2xl bg-white/10 px-2 py-3 text-center sm:px-4 sm:py-5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-200/60">
              Ventes
            </span>
            <span className="mt-1 block text-xl font-black text-white tabular-nums sm:mt-2 sm:text-2xl">
              <AnimatedCounter value={todaySalesCount} format={(n) => String(n)} />
            </span>
          </div>
          <div className="rounded-2xl bg-white/10 px-2 py-3 text-center sm:px-4 sm:py-5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-200/60">
              Clients
            </span>
            <span className="mt-1 block text-xl font-black text-white tabular-nums sm:mt-2 sm:text-2xl">
              <AnimatedCounter value={todayCustomers ?? 0} format={(n) => String(n)} />
            </span>
          </div>
          <div className="rounded-2xl bg-white/10 px-2 py-3 text-center sm:px-4 sm:py-5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-200/60">
              Panier
            </span>
            <span className="mt-1 block text-xl font-black text-white tabular-nums sm:mt-2 sm:text-2xl">
              <AnimatedCounter value={avgPanier ?? 0} format={formatFCFA} />
            </span>
          </div>
        </div>
      </Card>

      {catalogueEmpty && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">
                  {isService ? "Créez votre première prestation" : "Créez votre premier produit"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez vos articles au catalogue pour commencer à encaisser.
                </p>
              </div>
              <Button asChild>
                <Link to="/stocks">
                  Aller aux stocks
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="grid grid-cols-4 gap-2 sm:gap-3"
      >
        {quickActions.map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3 text-center transition-colors hover:bg-accent sm:px-3 sm:py-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="text-xs font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </motion.div>
    </>
  );
}
