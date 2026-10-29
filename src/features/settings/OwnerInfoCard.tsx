import { Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getShopProfile } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";

/** Carte info péton (employé) : qui surveille la boutique — le propriétaire. */
export function OwnerInfoCard() {
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });
  const { data: profile } = useQuery({ queryKey: ["shop_profile"], queryFn: getShopProfile });

  if (identity?.role !== "employee") return null;

  const owner = profile?.ownerName?.trim() || "Non renseigné";
  const phone = profile?.phone?.trim() || "—";

  return (
    <div className="flat-card flex items-center gap-3 px-3 py-2.5 md:col-span-2">
      <Store className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 text-sm">
        <p className="text-small text-muted-foreground">Propriétaire de la boutique</p>
        <p className="truncate font-medium text-foreground">
          {owner} <span className="text-muted-foreground">— {phone}</span>
        </p>
      </div>
    </div>
  );
}
