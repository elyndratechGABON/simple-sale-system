import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { getShopProfile, purgeAllData } from "@/lib/db";
import { deleteShopRemote, releaseSeat, resetGatekeeper } from "@/lib/gatekeeper";
import { departFromGroup } from "@/lib/syncengine/pairing";
import { flushPendingRelease } from "@/lib/gatekeeper";
import { resetDeviceIdentity } from "@/lib/syncengine/identity";
import { savePreferences } from "@/lib/settings";
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
 * Zone rouge : suppression de la boutique.
 *
 * L'utilisateur veut : supprimer → partir → pouvoir recréer un compte immédiatement.
 * Pas de polling, pas d'attente côté serveur.
 *
 * Séquence :
 * 1. DELETE /api/v1/shops/{deviceId} sur l'orchestrateur
 * 2. departFromGroup() : stock restitué + device.leave + releaseSeat()
 * 3. flushPendingRelease() : pousse les ops vers le relais
 * 4. Délai court (2s) : laisse le temps aux ops de partir
 * 5. purgeAllData() : nettoie IndexedDB local
 * 6. resetDeviceIdentity() : nouveau deviceId + nouvelles clés + efface fingerprint
 * 7. resetGatekeeper() : nettoie verrous + fingerprint
 * 7. savePreferences({ onboarded: false }) : réinitialise l'onboarding
 *
 * Le handshake gère le reste : si l'orchestrateur n'a pas encore libéré la place,
 * l'auto-retry (device_limit_auto_reset) créera une nouvelle identité et retentera.
 */
export function DeleteShopCard() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: async () => {
      const profile = await getShopProfile();
      if (!profile) throw new Error("Aucune boutique enregistrée sur cet appareil.");

      // 1. Supprimer la boutique côté serveur
      const remote = await deleteShopRemote(profile.deviceId, profile.storeName);
      if (!remote.ok) {
        // Le serveur a refusé ou est injoignable : on prévient mais on continue
        // (la libération de place sera retryée plus tard).
        toast.warning(`Serveur : ${remote.error ?? "injoignable"}.`);
      }

      // 2. Quitter le groupe : restitue stock + device.leave
      await departFromGroup();

      // 3. Libérer la place côté serveur : c'est l'étape critique qui doit réussir
      // avant de pouvoir purger localement. Si releaseSeat échoue (network error,
      // preuve insuffisante), on interrompt la séquence pour éviter de créer
      // un "ghost device" compté par l'orchestrateur.
      const releaseResult = await releaseSeat(profile.deviceId);
      if (!releaseResult.ok) {
        throw new Error(
          "Impossible de contacter le serveur pour libérer l'appareil. " +
            "Veuillez réessayer quand vous aurez du réseau : " +
            (releaseResult.error ?? "erreur inconnue"),
        );
      }

      // 4. Pousser les ops vers le relais
      await flushPendingRelease();

      // 5. Laisser le temps aux ops de partir (relay → orchestrateur)
      await new Promise((r) => setTimeout(r, 2000));

      // 6. Purger tout localement (uniquement si releaseSeat a réussi)
      await purgeAllData();

      // 7. Nouvelle identité complète (deviceId + clés + fingerprint effacé)
      await resetDeviceIdentity();

      // 8. Nettoyer gatekeeper
      resetGatekeeper();

      // 9. Réinitialiser onboarding
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
    <div className="flat-card space-y-3">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" /> Supprimer la boutique
        </h2>
        <p className="text-small text-muted-foreground">
          Efface ce terminal et le compte de la boutique chez l'orchestrateur : historique des
          ventes, paiements, commandes et données synchronisées.
        </p>
      </header>
      <Button
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
        disabled={deleteMut.isPending}
      >
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
    </div>
  );
}
