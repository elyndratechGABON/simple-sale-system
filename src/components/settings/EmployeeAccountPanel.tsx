// Panneau employé des paramètres — LE seul contenu visible sous le rôle `employee`.
//
// Deux chemins pour supprimer ce compte employé, que le bouton « Supprimer mon
// compte » (toujours visible) propose au vendeur :
//
// Path demande (chemin PRINCIPAL) — le clic envoie une demande à l'orchestrateur
//            (`requestShopDeletion`) que le propriétaire approuve d'un bouton
//            « Supprimer » dans son tableau de bord (ou refuse) ; la décision revient
//            au handshake sous forme d'`delete_account_request` et l'employé consent
//            depuis DeleteRequestDialog. Rien n'est détruit ici : la fiche serveur ne
//            part qu'à la décision du propriétaire.
// Path QR — le vendeur scanne le QR de restitution du propriétaire, l'app agrège ses
//            ventes du jour et affiche un QR de clôture (aller-retour optique) : ses
//            dernières ventes sont donc partagées avant que la caisse soit purgée.
//
// Dans le path QR, le message part à l'orchestrateur AVANT la purge locale :
// `deleteShopRemote` efface la fiche de CET écran (le serveur d'abord), puis la purge
// locale repart au premier lancement. Rien de plus — seul l'écran disparaît ; le compte
// entier du commerce n'est supprimé côté serveur que si aucun autre écran n'en dépendait.
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
import { ensureIdentity, resetDeviceIdentity } from "@/lib/syncengine/identity";
import { buildClosingPayload, parseRestitutionRequest } from "@/lib/restitution";
import { closeEmployeeHistory, getShopProfile, purgeAllData } from "@/lib/db";
import { deleteShopRemote, requestShopDeletion, resetGatekeeper } from "@/lib/gatekeeper";
import { savePreferences } from "@/lib/settings";
import { Lock, Send, ShieldAlert, Trash2 } from "lucide-react";
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
  const [immediateOpen, setImmediateOpen] = useState(false);

  // Chemin demande : le propriétaire décide côté serveur, on ne purge rien ici.
  const requestMut = useMutation({
    mutationFn: async () => {
      const result = await requestShopDeletion();
      if (!result.submitted) {
        toast.error(result.error ?? "Impossible d'envoyer la demande.");
        return;
      }
      if (result.pending) {
        toast.success("Demande enregistrée — elle sera envoyée dès que le serveur répond.", {
          description: "Le propriétaire la tranchera depuis son tableau de bord.",
        });
      } else {
        toast.success("Demande envoyée au propriétaire.", {
          description: "Il l'acceptera ou la refusera depuis son tableau de bord.",
        });
      }
    },
    onError: (e: Error) => {
      setChoiceOpen(false);
      toast.error(e.message);
    },
  });

  // Chemin QR : suppression directe — message à l'orchestrateur puis purge locale.
  const deleteMut = useMutation({
    mutationFn: async () => {
      // Message à l'orchestrateur : la fiche de CET écran est supprimée côté serveur
      // (place libérée sur le compte du marchand). Serveur d'abord, purge locale ensuite ;
      // si le réseau manque on prévient mais on purge quand même — un employé qui veut
      // partir ne doit pas rester bloqué sur un serveur HS.
      const profile = await getShopProfile();
      if (!profile) throw new Error("Aucune boutique enregistrée sur cet appareil.");
      const remote = await deleteShopRemote(profile.deviceId, profile.storeName);
      if (!remote.ok) {
        toast.warning(`Serveur : ${remote.error ?? "injoignable"}. Purge locale quand même.`);
      }
      // La fin d'expérience se joue AVANT la purge : le `shopId` n'est lisible que dans
      // l'identité encore en place. Le carnet (identité stable + `employee_history`)
      // survit à la purge — c'est lui qui s'affichera sur « Mon expérience ».
      const identity = await ensureIdentity();
      await closeEmployeeHistory(identity.shopId);
      await purgeAllData();
      await resetDeviceIdentity();
      resetGatekeeper();
      savePreferences({ onboarded: false });
    },
    onSuccess: () => {
      toast.success("Compte supprimé — cette caisse n'est plus rattachée au compte.");
      window.location.reload();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
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

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Mon compte</h3>
      <p className="text-sm text-muted-foreground">
        Pour supprimer ce compte, le plus simple est d'envoyer une demande au propriétaire : il
        décide depuis son tableau de bord. Vous pouvez aussi présenter son QR de restitution. La
        suppression n'efface que <strong>cet appareil</strong> (ventes, produits, historique) et
        fait repartir l'application au premier lancement — le compte marchand n'est jamais touché.
      </p>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setChoiceOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Envoi demande au propriétaire
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => setImmediateOpen(true)}
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Supprimer cet appareil immédiatement
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
                setChoiceOpen(false);
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
                setChoiceOpen(false);
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

      {/* Suppression immédiate : confirmation directe (aucun serveur requis) */}
      <AlertDialog open={immediateOpen} onOpenChange={(v) => !v && setImmediateOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Éjecter cet appareil du compte ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Les données locales <strong>de cet appareil</strong> seront{" "}
                  <strong>définitivement effacées</strong> : ventes, produits et historique. Le
                  compte du propriétaire reste intact.
                </p>
                <p className="text-sm text-muted-foreground">
                  L'application repart au premier lancement. Action immédiate, sans validation du
                  propriétaire.
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
                setImmediateOpen(false);
                deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Suppression…" : "Tout effacer"}
            </AlertDialogAction>
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
    </div>
  );
}
