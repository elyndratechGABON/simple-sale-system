import { Lock, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { EmployeeAccount } from "./useEmployeeAccount";

/** Choix du chemin de suppression : demande au propriétaire ou QR de restitution. */
export function DeleteAskDialog({
  account,
  open,
  onOpenChange,
}: {
  account: EmployeeAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { requestMut, scanning, handleClosingScan } = account;
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Supprimer ce compte employé ?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Envoyez une demande au propriétaire (&agrave; trancher depuis son tableau de bord)
                ou passez par son QR de restitution.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2">
          <Button
            variant="destructive"
            className="w-full"
            disabled={requestMut.isPending}
            onClick={() => {
              onOpenChange(false);
              requestMut.mutate();
            }}
          >
            <Send className="h-4 w-4 mr-1" />
            {requestMut.isPending ? "Envoi…" : "Envoyer une demande au propriétaire"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={scanning}
            onClick={() => {
              onOpenChange(false);
              void handleClosingScan();
            }}
          >
            <Lock className="h-4 w-4 mr-1" />
            {scanning ? "Scan en cours…" : "Via le QR de restitution du propriétaire"}
          </Button>
          <AlertDialogCancel className="w-full mt-0">Annuler</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
