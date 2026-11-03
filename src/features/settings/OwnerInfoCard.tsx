import { Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getShopProfile } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";

/**
 * Carte info du PROPRIÉTAIRE de la boutique, lue directement depuis `shop_profile`
 * (IndexedDB) — jamais des préférences d'écran. Résout le bug « le nom du propriétaire
 * n'apparaît pas » : la fiche `shop_profiles.me` est la source (remplie à la création
 * du compte via `setShopAccount`, éditable via « Mon établissement »), affichée pour LES
 * DEUX rôles — un patron doit voir son identité dans Paramètres > Identité, pas
 * seulement ses employés. Valeur absente = « Non renseigné », jamais un champ vide.
 */
export function OwnerInfoCard() {
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });
  const { data: profile } = useQuery({ queryKey: ["shop_profile"], queryFn: getShopProfile });

  const patron = identity?.role !== "employee";

  const owner = profile?.ownerName?.trim() || "Non renseigné";
  const phone = profile?.phone?.trim() || "—";

  return (
    <div className="flat-card flex items-center gap-3 px-3 py-2.5 md:col-span-2">
      <Store className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 text-sm">
        <p className="text-small text-muted-foreground">
          {patron ? "Propriétaire (vous)" : "Propriétaire de la boutique"}
        </p>
        <p className="font-medium text-foreground whitespace-normal break-words">
          {owner} <span className="text-muted-foreground">— {phone}</span>
        </p>
      </div>
    </div>
  );
}
