import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { getShopProfile, purgeAllData } from "@/lib/db";
import { deleteShopRemote, resetGatekeeper } from "@/lib/gatekeeper";
import { departFromGroup } from "@/lib/syncengine/pairing";
import { savePreferences } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
 * Zone rouge : suppression de la boutique.
 *
 * Le serveur d'abord, la base locale ensuite — tout ou rien. Si le réseau manque, rien
 * n'est effacé : on ne veut pas d'un appareil dont le serveur croirait encore le compte
 * actif, qui ressusciterait au prochain handshake (auto-provisionnement). Après la purge,
 * l'application revient au premier lancement : l'assistant rouvre, un nouveau `deviceId`
 * est généré au prochain montage, et le serveur recrée une boutique à l'essai.
 */
export function DeleteShopCard() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: async () => {
      const profile = await getShopProfile();
      if (!profile) throw new Error("Aucune boutique enregistrée sur cet appareil.");
      const remote = await deleteShopRemote(profile.deviceId, profile.storeName);
      if (!remote.ok) {
        // Le serveur a refusé ou est injoignable (CORS, panne) : on prévient mais on
        // continue la purge locale — l'utilisateur ne doit pas rester bloqué.
        toast.warning(`Serveur : ${remote.error ?? "injoignable"}. Purge locale quand même.`);
      }
      // LE DÉPART, avant la purge : le stock restant retourne au patron, le groupe est
      // prévenu, et la PLACE est rendue à l'orchestrateur. Sans ce geste, l'écran
      // supprimé continuait de compter une place — le commerce ne pouvait plus
      // recrouver d'employé (« nombre limite d'appareils atteint »).
      await departFromGroup();
      await purgeAllData();
      resetGatekeeper();
      savePreferences({ onboarded: false });
    },
    onSuccess: () => {
      toast.success("Boutique supprimée — au premier lancement !");
      window.location.reload();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" /> Supprimer la boutique
        </CardTitle>
        <CardDescription>
          Efface ce terminal et le compte de la boutique chez l'orchestrateur : historique des
          ventes, paiements, commandes et données synchronisées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" /> Supprimer la boutique
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={(v) => !v && setConfirmOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Tout effacer ?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    Les données de <strong>cet appareil</strong> et le compte de la boutique sur le
                    serveur seront <strong>définitivement effacés</strong> : ventes, produits,
                    paiements et abonnement. Cette action est irréversible.
                  </p>
                  <p>
                    L'application repart au premier lancement, avec une base vierge et un essai
                    renouvelé.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  // Empêche Radix de fermer le dialogue pendant la suppression : il
                  // reste ouvert tant que le réseau travaille, et se referme en cas
                  // d'échec (onError) — en cas de succès, la page se recharge.
                  e.preventDefault();
                  deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? "Suppression…" : "Tout effacer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
