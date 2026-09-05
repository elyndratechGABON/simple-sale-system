// Panneau employé des paramètres — LE seul contenu visible sous le rôle `employee`.
//
// Deux chemins pour supprimer ce compte employé, que le bouton « Supprimer mon
// compte » (toujours visible) propose au vendeur :
//
// Path QR — le vendeur scanne le QR de restitution du propriétaire, l'app agrège ses
//            ventes du jour et affiche un QR de clôture (même aller-retour optique qu'à
//            l'accueil `accueil.tsx`) : ses dernières ventes sont donc partagées avant
//            que la caisse soit purgée.
// Path orchestrateur — le tableau de bord a envoyé une demande (`delete_account_request`,
//            consommée par le handshake et stockée : `getDeleteAccountRequest`). Le vendeur
//            la voit ici et la consent, ou l'écarte.
//
// Dans les DEUX cas, tout est local : purge de la base, remise à zéro du gatekeeper,
// retour au premier lancement. Jamais `deleteShopRemote` — le compte entier du commerce
// n'est pas touché, l'orchestrateur a déjà tranché côté serveur le cas échéant.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useAccess } from "@/hooks/use-access";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { buildClosingPayload, parseRestitutionRequest } from "@/lib/restitution";
import { purgeAllData } from "@/lib/db";
import {
  clearDeleteAccountRequest,
  getDeleteAccountRequest,
  resetGatekeeper,
  type DeleteAccountRequest,
} from "@/lib/gatekeeper";
import { savePreferences } from "@/lib/settings";
import { Lock, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DAY_MS = 86_400_000;

export function EmployeeAccountPanel() {
  // Défense en profondeur : ce panneau n'est monté que pour les employés (settings.tsx),
  // mais on ne rend rien si un autre rôle s'y retrouve (lien direct, bug de nav).
  const { role } = useAccess();
  const { scanning, startScan } = useBarcodeScanner();
  const [closingQrDataUrl, setClosingQrDataUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [orchRequest, setOrchRequest] = useState<DeleteAccountRequest | null>(null);

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
      setConfirmOpen(false);
      setOrchestratorOpen(false);
      toast.error(e.message);
    },
  });

  if (role !== "employee") return null;

  // Path QR : scan du QR de restitution du propriétaire → QR de clôture (aujourd'hui).
  // Le QR affiché est présenté au propriétaire AVANT la suppression — c'est la condition
  // pour que l'effacement soit autorisé (dernières ventes partagées).
  async function handleClosingScan() {
    setError(null);
    try {
      const text = await startScan();
      if (!text) return;
      const request = parseRestitutionRequest(text);
      if (!request) {
        setError("Ce code n'est pas un QR de restitution ELYNDRA. Suppression bloquée.");
        return;
      }
      const identity = await ensureIdentity();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const from = startOfToday.getTime();
      const to = from + DAY_MS;

      const closing = await buildClosingPayload(
        request,
        from,
        to,
        identity.employeeName ?? "",
        identity.deviceId,
      );
      const { default: QRCodeLib } = await import("qrcode");
      const qr = await QRCodeLib.toDataURL(JSON.stringify(closing));
      setClosingQrDataUrl(qr);
      setSummary(
        `${closing.sales} vente(s) · ${closing.revenue} F CFA · bénéfice ${closing.profit} F CFA`,
      );
    } catch {
      setError("Caméra indisponible ou QR illisible — réessayez.");
    }
  }

  // Path orchestrateur : une demande déposée par le handshake est consentie ici. Sans
  // demande en attente, on l'explique au vendeur — le propriétaire lance la suppression
  // depuis son tableau de bord.
  async function pickOrchestrator() {
    setChoiceOpen(false);
    const req = await getDeleteAccountRequest();
    if (req) {
      setOrchRequest(req);
      setOrchestratorOpen(true);
    } else {
      toast.info(
        "Aucune demande en attente. Le propriétaire doit demander la suppression depuis son tableau de bord — ou présentez-vous son QR de restitution.",
      );
    }
  }

  async function refuseOrchestrator() {
    await clearDeleteAccountRequest();
    setOrchestratorOpen(false);
    setOrchRequest(null);
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Mon compte</h3>
      <p className="text-sm text-muted-foreground">
        Supprimer ce compte employé efface <strong>cet appareil</strong> (ventes, produits,
        historique) et fait repartir l'application au premier lancement. Les données du compte
        marchand ne sont jamais touchées.
      </p>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setChoiceOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Supprimer mon compte
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {summary && !closingQrDataUrl && (
        <p className="text-sm font-medium text-muted-foreground">{summary}</p>
      )}

      {closingQrDataUrl && (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">{summary}</p>
          <p className="text-xs text-muted-foreground">
            Présentez ce QR au propriétaire (espace « Employés ») pour transférer vos ventes, puis
            confirmez la suppression.
          </p>
          <img
            src={closingQrDataUrl}
            alt="QR de clôture"
            className="mx-auto h-44 w-44 border rounded-lg"
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-muted-foreground"
              onClick={() => {
                setClosingQrDataUrl(null);
                setSummary(null);
              }}
            >
              Recommencer
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Tout effacer
            </Button>
          </div>
        </div>
      )}

      {/* Choix du chemin de suppression */}
      <AlertDialog open={choiceOpen} onOpenChange={(v) => !v && setChoiceOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Supprimer ce compte employé ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Comment souhaitez-vous procéder ?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={scanning}
              onClick={() => {
                setChoiceOpen(false);
                void handleClosingScan();
              }}
            >
              <Lock className="h-4 w-4 mr-1" />
              {scanning ? "Scan en cours…" : "Via le QR de restitution du propriétaire"}
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => void pickOrchestrator()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Demande envoyée depuis l'orchestrateur
            </Button>
            <AlertDialogCancel className="w-full mt-0">Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation finale (après QR de clôture) */}
      <AlertDialog open={confirmOpen} onOpenChange={(v) => !v && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Supprimer ce compte employé ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Les ventes de cette caisse sont désormais chez le propriétaire. Les données
                  locales <strong>de cet appareil</strong> seront{" "}
                  <strong>définitivement effacées</strong> : ventes, produits et historique. Aucune
                  donnée du compte marchand n'est touchée.
                </p>
                <p className="text-sm text-muted-foreground">
                  L'application repart au premier lancement.
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

      {/* Consente à la demande envoyée par l'orchestrateur */}
      <AlertDialog open={orchestratorOpen} onOpenChange={(v) => !v && refuseOrchestrator()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Suppression demandée par le
              propriétaire
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Le propriétaire a demandé la suppression de cette caisse depuis le tableau de
                  bord. En acceptant, les données locales <strong>de cet appareil</strong> seront{" "}
                  <strong>définitivement effacées</strong> : ventes, produits et historique.
                </p>
                {orchRequest?.message && (
                  <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                    {orchRequest.message}
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
            <AlertDialogCancel onClick={() => void refuseOrchestrator()}>Refuser</AlertDialogCancel>
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
    </div>
  );
}
