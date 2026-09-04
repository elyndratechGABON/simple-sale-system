"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Utensils, Store } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ACTIVE_CLUSTERS, savePreferences, type Preferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { listOpenTables, cancelSale } from "@/lib/db";
import { resolveIcon } from "@/components/settings/icon-map";

export function BusinessCard() {
  const qc = useQueryClient();
  const { cluster, tablesEnabled, customDomain } = usePreferences();
  const clusterConfig = ACTIVE_CLUSTERS.find((c) => c.id === cluster);
  const ClusterIcon = clusterConfig ? resolveIcon(clusterConfig.icon) : Store;

  function commit(patch: Partial<Preferences>) {
    savePreferences(patch);
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  const { data: openTables = [] } = useQuery({
    queryKey: ["sales", "open"],
    queryFn: listOpenTables,
    staleTime: 15_000,
  });
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [disabling, setDisabling] = useState(false);

  function onTablesToggle(v: boolean) {
    if (v) {
      commit({ tablesEnabled: true });
      toast.success("Système de tables activé");
      return;
    }
    if (openTables.length > 0) {
      setConfirmingDisable(true);
      return;
    }
    void disableTables();
  }

  async function disableTables() {
    setDisabling(true);
    try {
      for (const t of openTables) await cancelSale(t.id);
      commit({ tablesEnabled: false, tables: [] });
      qc.invalidateQueries({ queryKey: ["sales", "open"] });
      qc.invalidateQueries({ queryKey: ["open_tables"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        openTables.length > 0
          ? `${openTables.length} table(s) annulée(s) — articles retournés en rayon.`
          : "Système de tables désactivé",
      );
    } catch {
      toast.error("Impossible de désactiver les tables — réessayez.");
    } finally {
      setDisabling(false);
      setConfirmingDisable(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4" /> Type de commerce
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clusterConfig && (
          <div className="flex items-center gap-3 rounded-xl border bg-accent/50 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ClusterIcon className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-semibold">{clusterConfig.label.split("/")[0].trim()}</p>
              {cluster === "personnalise" && customDomain && (
                <p className="text-sm font-medium text-foreground">{customDomain}</p>
              )}
              <p className="text-sm text-muted-foreground">{clusterConfig.description}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <div className="flex items-center gap-2 font-medium">
              <Utensils className="h-4 w-4" /> Système de tables
            </div>
            <p className="text-sm text-muted-foreground">
              {tablesEnabled
                ? "Commandes par table, encaissées en fin de service."
                : "Service direct : chaque vente est encaissée à la commande."}
            </p>
          </div>
          <Switch
            checked={tablesEnabled}
            onCheckedChange={onTablesToggle}
            disabled={disabling}
            aria-label="Activer le système de tables"
          />
        </div>

        <AlertDialog
          open={confirmingDisable}
          onOpenChange={(v) => !v && setConfirmingDisable(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Désactiver le système de tables ?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-2">
                  <p>
                    {openTables.length} table{openTables.length > 1 ? "s" : ""} ouverte
                    {openTables.length > 1 ? "s" : ""} encore active
                    {openTables.length > 1 ? "s" : ""} seront annulées : les articles servis
                    retournent en rayon et ne seront pas encaissés.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les tables configurées dans « Tables » seront aussi retirées ; réactiver le
                    système de tables ne les restaurera pas.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={disabling}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => void disableTables()} disabled={disabling}>
                {disabling ? "…" : "Désactiver et annuler"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
