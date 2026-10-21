// Bandeau « Mode maintenance » : l'orchestrateur a coupé la synchronisation.
//
// ⚠️ La caisse N'EST PAS bloquée : elle encaisse, elle écrit en local, elle vend.
// C'est la synchronisation entre écrans qui est en pause (une opération de
// maintenance serveur, par exemple). Le bandeau le dit, pour que le commerçant
// sache pourquoi son stock ne se met pas à jour chez les autres.
import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { getMaintenanceState } from "@/lib/sync/maintenance";

export function MaintenanceBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const state = await getMaintenanceState();
      if (alive) setMessage(state.enabled ? state.message : null);
    };
    void check();
    // Le handshake défait la carence (toutes les minutes) : on surveille l'état.
    const timer = setInterval(check, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (message === null) return null;

  return (
    <div className="w-full bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-700 flex items-center justify-center gap-2 dark:text-blue-300">
      <Wrench className="h-4 w-4 shrink-0" />
      <span>
        Maintenance en cours — la synchronisation est en pause, la caisse fonctionne normalement.
        {message ? ` ${message}` : ""}
      </span>
    </div>
  );
}
