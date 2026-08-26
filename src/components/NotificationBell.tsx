// Cloche de notifications de l'en-tête : badge du nombre d'alertes non lues et
// dialogue listant chaque alerte avec son lien de résolution.
//
// Les alertes viennent du moteur PUR src/lib/alerts.ts, alimenté par les mêmes requêtes
// React Query que le tableau de bord (`["products"]`, `["open_tables"]`) — les deux
// écrans partagent donc exactement la même lecture des données, sans state partagé.
//
// « Non lu » est mémorisé dans localStorage sous forme d'identifiants d'alertes déjà
// vues. Un identifiant ne change pas tant que la situation persiste (ex. `low-stock:12`),
// donc ouvrir le centre une fois fait taire l'alerte jusqu'à ce qu'elle disparaisse puis
// revienne — c'est le comportement attendu, pas un badge qui clignote en boucle.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, CircleAlert, TriangleAlert, Info as InfoIcon, type LucideIcon } from "lucide-react";
import { listProducts, listOpenTables, listActiveRentals } from "@/lib/db";
import { buildAlerts, type AlertSeverity } from "@/lib/alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SEEN_KEY = "alerts_seen";
const SEEN_CAP = 50;

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-SEEN_CAP)));
  } catch {
    // localStorage plein ou indisponible : le badge se contente de tout compter.
  }
}

const SEVERITY_STYLE: Record<AlertSeverity, { icon: LucideIcon; dot: string; text: string }> = {
  danger: { icon: CircleAlert, dot: "bg-destructive", text: "text-destructive" },
  warning: { icon: TriangleAlert, dot: "bg-amber-500", text: "text-amber-500" },
  info: { icon: InfoIcon, dot: "bg-sky-500", text: "text-sky-500" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  // Bumpé quand la liste « vu » change, pour recompter le badge au rendu suivant.
  const [seenVersion, setSeenVersion] = useState(0);
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
    staleTime: 30_000,
  });
  const { data: openTables } = useQuery({
    queryKey: ["open_tables"],
    queryFn: listOpenTables,
    staleTime: 30_000,
  });
  const { data: activeRentals } = useQuery({
    queryKey: ["rentals", "active"],
    queryFn: listActiveRentals,
    staleTime: 30_000,
  });
  const alerts = useMemo(
    () => buildAlerts(products ?? [], openTables ?? [], activeRentals),
    [products, openTables, activeRentals],
  );
  const unseenCount = useMemo(() => {
    void seenVersion;
    const seen = new Set(readSeen());
    return alerts.filter((a) => !seen.has(a.id)).length;
  }, [alerts, seenVersion]);

  function markAllSeen() {
    writeSeen([...readSeen(), ...alerts.map((a) => a.id)]);
    setSeenVersion((v) => v + 1);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) markAllSeen();
        setOpen(next);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={unseenCount > 0 ? `Notifications (${unseenCount} nouvelles)` : "Notifications"}
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 tabular-nums">
            {unseenCount > 9 ? "9+" : unseenCount}
          </Badge>
        )}
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </DialogTitle>
          <DialogDescription>
            Stock, tables en cours — tout ce qui attend une action de votre part.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {alerts.length === 0 && (
            <p className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune alerte. Tout va bien.
            </p>
          )}
          {alerts.map((alert) => {
            const style = SEVERITY_STYLE[alert.severity];
            const Icon = style.icon;
            return (
              <Link
                key={alert.id}
                to={alert.to}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                <span className={`mt-0.5 shrink-0 ${style.text}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{alert.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {alert.detail}
                  </span>
                </span>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
