import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, LogOut } from "lucide-react";
import { leaveShop } from "@/lib/syncengine/pairing";
import { Button } from "@/components/ui/button";
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
 * Zone rouge : démission d'un écran employé.
 *
 * L'appareil se retire LUI-MÊME du compte du propriétaire : une op `device.leave` signée
 * par sa clé efface sa fiche du registre chez tout le monde (la clé publique part avec
 * elle — plus aucune de ses ops ne sera acceptée après coup). Puis la base locale est
 * purgée et l'application revient au premier lancement. Aucun appel serveur : l'op fait
 * le travail, convergée par le relais comme une vente.
 */
export function ResignCard() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const leaveMut = useMutation({
    mutationFn: () => leaveShop(),
    onSuccess: () => {
      toast.success("Vous avez quitté la boutique — au premier lancement !");
      window.location.reload();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  return (
    <div className="flat-card space-y-3">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <LogOut className="h-5 w-5 text-destructive" /> Quitter la boutique
        </h2>
        <p className="text-small text-muted-foreground">
          Retire cet écran du compte du propriétaire : il disparaît de son liste d'équipe et ne
          synchronise plus rien avec elle.
        </p>
      </header>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        <LogOut className="h-4 w-4 mr-2" /> Quitter la boutique
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={(v) => !v && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Quitter la boutique ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Cet écran sera <strong>retiré du compte</strong> du propriétaire, et toutes ses
                  données locales seront <strong>définitivement effacées</strong> : ventes,
                  produits, clients. Cette action est irréversible.
                </p>
                <p>
                  L'application repart au premier lancement, avec une base vierge — prête à être
                  réinscrite dans une autre boutique.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                // Empêche Radix de fermer le dialogue pendant le départ : il reste
                // ouvert tant que l'op part, et se referme en cas d'échec (onError) —
                // en cas de succès, la page se recharge.
                e.preventDefault();
                leaveMut.mutate();
              }}
              disabled={leaveMut.isPending}
            >
              {leaveMut.isPending ? "Départ…" : "Quitter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
