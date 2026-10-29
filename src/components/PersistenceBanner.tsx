import { Database, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

/**
 * Badge « Stockage sécurisé » : affiché quand `navigator.storage.persisted()` répond
 * vrai — le navigateur GARANTIT la conservation des données de cet appareil. Réactif
 * (le statut se lit au hook) : après acceptation, aucune résuelle ne grise le badge
 * tant que l'app n'est pas rechargée.
 */
export function PersistenceBadge() {
  const { status, grant } = usePersistentStorage();

  if (status === "loading") {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Database className="h-3 w-3" /> Stockage…
      </Badge>
    );
  }
  if (status === "persisted") {
    return (
      <Badge className="gap-1.5">
        <ShieldCheck className="h-3 w-3" /> Stockage sécurisé
      </Badge>
    );
  }
  if (status === "unsupported") {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Database className="h-3 w-3" /> Stockage non persistant (navigateur)
      </Badge>
    );
  }
  // prompt : propose l'activation directement depuis le badge.
  return (
    <Badge variant="outline" className="gap-1.5">
      <Database className="h-3 w-3" /> Stockage non sécurisé
      <button
        type="button"
        className="font-semibold underline underline-offset-2"
        onClick={() => void grant()}
      >
        Sécuriser
      </button>
    </Badge>
  );
}
