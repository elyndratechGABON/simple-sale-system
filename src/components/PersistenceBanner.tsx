import { Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePersistentStorage } from "@/hooks/use-persistent-storage";

/**
 * Bandeau « stockage persistant » : le navigateur n'a pas GARANTI la conservation
 * des données IndexedDB (ventes, stock, comptes). Sans cette garantie, vider le
 * cache peut tout effacer — on demande le geste à l'utilisateur, que le navigateur
 * accorde bien plus volontiers que le `persist()` silencieux de PwaBootstrap.
 *
 * Rend RIEN quand le stockage est déjà persistant ou que l'API n'existe pas.
 */
export function PersistenceBanner() {
  const { status, grant } = usePersistentStorage();

  if (status !== "prompt") return null;

  async function accepter() {
    const granted = await grant();
    if (granted) {
      toast.success("Stockage persistant activé — vos données sont protégées.");
    } else {
      toast.info(
        "Demande refusée par le navigateur. Installez l'application puis réessayez — les PWA l'obtiennent presque toujours.",
      );
    }
  }

  return (
    <div className="w-full bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 flex-wrap">
      <Database className="h-4 w-4 shrink-0" />
      <span>
        Pour éviter de perdre vos ventes et votre stock si le navigateur vide son cache, autorisez
        le stockage persistant.
      </span>
      <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => void accepter()}>
        Autoriser
      </Button>
    </div>
  );
}
