import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Utensils } from "lucide-react";
import { savePreferences, type Preferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { cancelSale, listOpenTables } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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

/**
 * Plan de salle : active ou retire les tables de la caisse.
 *
 * Désactiver le système de tables RETIRE les tables : les additions ouvertes sont
 * annulées (les articles retournent en rayon — ce ne sont pas des ventes encaissées)
 * et la liste des tables configurées est vidée. Confirmation demandée lorsqu'une
 * addition reste ouverte.
 */
export function BusinessCard() {
  const qc = useQueryClient();
  const { features } = usePreferences();
  const tablesEnabled = features?.tables ?? false;

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
      commit({ features: { tables: true } });
      toast.success("Plan de salle activé");
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
      commit({ features: { tables: false }, tables: [] });
      qc.invalidateQueries({ queryKey: ["sales", "open"] });
      qc.invalidateQueries({ queryKey: ["open_tables"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        openTables.length > 0
          ? `${openTables.length} table(s) annulée(s) — articles retournés en rayon.`
          : "Plan de salle désactivé",
      );
    } catch {
      toast.error("Impossible de désactiver le plan de salle — réessayez.");
    } finally {
      setDisabling(false);
      setConfirmingDisable(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="h-4 w-4" /> Plan de salle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="font-medium">
              {tablesEnabled
                ? "Commandes par table, encaissées en fin de service."
                : "Service direct : chaque vente est encaissée à la commande."}
            </p>
          </div>
          <Switch
            checked={tablesEnabled}
            onCheckedChange={onTablesToggle}
            disabled={disabling}
            aria-label="Activer le plan de salle"
          />
        </div>

        {tablesEnabled && (
          <AlertDialog
            open={confirmingDisable}
            onOpenChange={(v) => !v && setConfirmingDisable(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Désactiver le plan de salle ?
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
                      plan de salle ne les restaurera pas.
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
        )}
      </CardContent>
    </Card>
  );
}
