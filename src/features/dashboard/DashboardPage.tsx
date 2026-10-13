import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { AlertsSection } from "./AlertsSection";
import { DashboardDetails } from "./DashboardDetails";
import { DashboardOverview } from "./DashboardOverview";
import { useDashboardData } from "./useDashboardData";

export function DashboardPage() {
  const data = useDashboardData();

  return (
    <div className="app-container space-y-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            Bonjour{data.greetingName ? `, ${data.greetingName}` : ""}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Vue d'ensemble de votre activité
          </p>
        </div>
        <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm sm:flex">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
      </motion.div>

      <DashboardOverview data={data} />

      <AlertsSection alerts={data.alerts} />

      <DashboardDetails data={data} />
    </div>
  );
}
