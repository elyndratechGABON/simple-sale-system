// BADGE DE TRANSFERT (mission badge ACK — Étape 2) : sur la fiche d'un employé, dit
// si un instantané attend encore d'être appliqué chez lui.
//   - orange « En cours… » (horloge) : une op `catalogue.snapshot` PENDING de la
//     outbox porte `target_device_id = cet employé` — elle partira au prochain push ;
//   - vert « À jour » (coche) : aucune op en attente — soit tout est parti et a été
//     acquitté (l'op `catalogue.ack` du pair a purgé l'outbox), soit rien à envoyer.
//
// La requête lit la TABLE `sync_ops` (l'outbox) : l'invalidation de la clé
// `["share_pending"]` est déclenchée au clic « Partager » (dialogue) puis à la
// réception de chaque `catalogue.ack` — le badge bascule sans recharger la page.
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";
import { getDB } from "@/lib/db";
import { cn } from "@/lib/utils";

/** Y a-t-il un snapshot PENDING destiné à CET employé dans la outbox locale ? */
function useSharePending(deviceId: string | null | undefined): boolean {
  const { data } = useQuery({
    queryKey: ["share_pending", deviceId],
    enabled: !!deviceId,
    staleTime: 5_000,
    queryFn: async (): Promise<boolean> => {
      const db = getDB();
      const ops = await db.sync_ops.where("status").equals("pending").toArray();
      return ops.some((o) => {
        if (o.type !== "catalogue.snapshot") return false;
        const pl = o.payload as { target_device_id?: string } | null;
        return pl?.target_device_id === deviceId;
      });
    },
  });
  return data ?? false;
}

export function ShareBadge({ deviceId }: { deviceId: string }) {
  const enCours = useSharePending(deviceId);
  return (
    <span
      role="status"
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        enCours ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700",
      )}
    >
      {enCours ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      {enCours ? "En cours…" : "À jour"}
    </span>
  );
}
