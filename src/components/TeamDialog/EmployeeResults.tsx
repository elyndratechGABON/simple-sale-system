import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Receipt, TrendingUp } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { listSales } from "@/lib/db";
import type { PairedDevice } from "@/lib/syncengine/types";
import { RoleBadge } from "./RoleBadge";
import { isOwnSale, monthStart } from "./helpers";

/** Résultats d'un écran : CA et ventes sur la période, filtrés par vendeur. */
export function EmployeeResults({ device }: { device: PairedDevice }) {
  const [range, setRange] = useState<"day" | "week" | "month">("month");

  const from =
    range === "day"
      ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
      : range === "week"
        ? Date.now() - 7 * 86400_000
        : monthStart();

  const { data: sales } = useQuery({
    queryKey: ["team_activity", device.id, from],
    queryFn: () => listSales(from, Date.now()),
    staleTime: 10_000,
  });

  const ownSales = (sales ?? []).filter((s) => isOwnSale(s, device));
  const revenue = ownSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-3">
      {/* Identité de la personne : nom + numéro joignable, tels que l'écran les déclare */}
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {device.device_name?.trim() || "Écran sans nom"}
          </p>
          {device.phone?.trim() ? (
            <a
              href={`tel:${device.phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
            >
              <Phone className="h-3 w-3" />
              {device.phone.trim()}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">Numéro non déclaré par cet écran.</p>
          )}
        </div>
        <RoleBadge role={device.role} />
      </div>

      {/* Sélecteur de période */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { k: "day", label: "Aujourd'hui" },
            { k: "week", label: "7 jours" },
            { k: "month", label: "Ce mois" },
          ] as const
        ).map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setRange(k)}
            className={[
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              range === k
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Total de la période */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">Total encaissé</p>
          <p className="text-xl font-bold tabular-nums">{formatFCFA(revenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Ventes</p>
          <p className="text-xl font-bold tabular-nums">{ownSales.length}</p>
        </div>
      </div>

      {/* Ventes de l'écran */}
      {ownSales.length > 0 ? (
        <div className="space-y-1.5">
          {ownSales.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <Receipt className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {s.client_name ? ` · ${s.client_name}` : ""}
                </span>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatFCFA(s.total)}</span>
            </div>
          ))}
          {ownSales.length > 10 && (
            <p className="text-xs text-muted-foreground">
              +{ownSales.length - 10} autre{ownSales.length - 10 > 1 ? "s" : ""} vente
              {ownSales.length - 10 > 1 ? "s" : ""} sur la période.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-6 text-center">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune vente sur cette période.</p>
        </div>
      )}
    </div>
  );
}
