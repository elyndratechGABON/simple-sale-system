import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import type { DeviceRole } from "@/lib/syncengine/types";

/** Badge coloré selon le rôle. */
export function RoleBadge({ role }: { role?: DeviceRole }) {
  if (!role || role === "owner") {
    return (
      <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
        <BadgeCheck className="h-3 w-3" />
        {ROLE_LABELS.owner}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      {ROLE_LABELS.employee}
    </Badge>
  );
}
