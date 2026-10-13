import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CircleAlert, TriangleAlert, Info as InfoIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import type { AppAlert } from "@/lib/alerts";

const SEVERITY_ICON: Record<AppAlert["severity"], LucideIcon> = {
  danger: CircleAlert,
  warning: TriangleAlert,
  info: InfoIcon,
};

const SEVERITY_CLASS: Record<AppAlert["severity"], string> = {
  danger: "text-destructive",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export function AlertsSection({ alerts }: { alerts: AppAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  if (alerts.length === 0) return null;
  const visible = expanded ? alerts : alerts.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
    >
      <Card>
        <div className="border-b px-4 py-2.5">
          <p className="text-base font-semibold">Nouvelles alertes</p>
          <p className="text-xs text-muted-foreground">Ce qui attend une action de votre part.</p>
        </div>
        <div className="space-y-1.5 p-3">
          {visible.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            return (
              <Link
                key={alert.id}
                to={alert.to}
                className="flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
              >
                <span className={`mt-0.5 shrink-0 ${SEVERITY_CLASS[alert.severity]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{alert.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {alert.detail}
                  </span>
                </span>
              </Link>
            );
          })}
          {alerts.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Réduire" : `Tout voir (${alerts.length})`}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
