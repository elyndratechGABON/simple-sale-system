import { useState } from "react";
import { Wifi, ChevronDown, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function MasterSyncBadge({
  peers = [],
}: {
  peers?: { id: string; device_name?: string; role?: string; status?: string; phone?: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Voir les appareils synchronisés"
          className="flex items-center gap-1.5 rounded-full border bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 border-emerald-200"
        >
          <Wifi className="h-3 w-3" />
          <span>Sync</span>
          {peers.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white">
              {peers.length}
            </span>
          )}
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Wifi className="h-4 w-4 text-emerald-600" />
          <span className="font-medium">Appareils synchronisés</span>
        </div>
        {peers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun autre écran rencontré.</p>
        ) : (
          <ul className="space-y-2">
            {peers.map((p) => (
              <li key={p.id} className="rounded-lg border bg-card px-2.5 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate max-w-[140px]">
                    {p.device_name || "Écran sans nom"}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {p.role || "employé"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <UserRound className="h-3 w-3" />
                  <span className="truncate">{p.phone || "—"}</span>
                  <span>· {p.id.slice(0, 6)}…</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
