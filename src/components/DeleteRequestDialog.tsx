// Dialog « Demande de suppression » — second chemin de suppression d'un compte
// employé, côté orchestrateur.
//
// Le tableau de bord envoie une commande `delete_account_request` (handshake) ;
// la caisse ciblée (`payload.device_id` = device_id local) la pose dans IndexedDB —
// voir `applyCommand` dans gatekeeper.ts. Ce composant, monté dans la mise en page
// de l'application, la surveille et demande au vendeur de CONSENTIR : accepter purge
// CET appareil (retour au premier lancement), refuser l'écarte sans rien détruire.
//
// Tout est local, comme dans le panneau QR (`EmployeeAccountPanel`) : jamais de
// `deleteShopRemote` — l'orchestrateur a déjà tranché côté serveur, l'employé qui
// refuse reste simplement une caisse rattachée que le compte pourra libérer plus tard.
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useAccess } from "@/hooks/use-access";
import {
  clearDeleteAccountRequest,
  getDeleteAccountRequest,
  type DeleteAccountRequest,
} from "@/lib/gatekeeper";
import { purgeAllData } from "@/lib/db";
import { resetGatekeeper } from "@/lib/gatekeeper";
import { savePreferences } from "@/lib/settings";
import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteRequestDialog() {
  const { role } = useAccess();
  const [request, setRequest] = useState<DeleteAccountRequest | null>(null);

  // La demande vit dans IndexedDB (posée par le handshake de fond) : on la retrouve
  // par un petit poll, sans store partagé — même schéma que GatekeeperAlerts.
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const r = await getDeleteAccountRequest();
      if (live) setRequest(r);
    };
    void refresh();
    const timer = setInterval(refresh, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  const deleteMut = useMutation({
    mutationFn: async () => {
      await purgeAllData();
      resetGatekeeper();
      savePreferences({ onboarded: false });
    },
    onSuccess: () => {
      toast.success("Compte supprimé — cette caisse n'est plus rattachée au compte.");
      window.location.reload();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  async function refuse() {
    await clearDeleteAccountRequest();
    setRequest(null);
  }

  // Défense en profondeur : la commande n'est honorée que sur la caisse cible (gatekeeper),
  // et un propriétaire n'a pas à voir ce dialogue — sa suppression passe par DeleteShopCard.
  if (role !== "employee" || !request) return null;

  return (
    <AlertDialog
      open
      onOpenChange={(v) => {
        if (!v) void refuse();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Suppression demandée par le
            propriétaire
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Le propriétaire de ce compte a demandé la suppression de votre caisse depuis le
                tableau de bord. En acceptant, les données locales <strong>de cet appareil</strong>{" "}
                seront <strong>définitivement effacées</strong> : ventes, produits et historique.
              </p>
              {request.message && (
                <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                  {request.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                L'application repart au premier lancement. Vous pouvez aussi refuser : la caisse
                reste en place et rien n'est effacé.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void refuse()}>Refuser</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              deleteMut.mutate();
            }}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleteMut.isPending ? "Suppression…" : "Accepter et effacer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
