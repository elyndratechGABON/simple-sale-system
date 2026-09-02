import { Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MasterSyncBadge({ peersCount = 0 }: { peersCount?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Wifi className="h-3.5 w-3.5 text-emerald-600" />
      <Badge
        variant="outline"
        className="text-[10px] h-5 gap-1 border-emerald-200 text-emerald-700 bg-emerald-50"
      >
        {peersCount > 0 ? `${peersCount} appareil${peersCount > 1 ? "s" : ""}` : "Sync P2P"}
      </Badge>
    </div>
  );
}
