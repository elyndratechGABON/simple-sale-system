// Panneau employé des paramètres — LE seul contenu visible sous le rôle `employee`.
//
// Il porte une demande de suppression de compte assortie d'une GARANTIE : avant de
// permettre l'effacement, l'employé doit faire passer un dernier QR de clôture au
// propriétaire (même aller-retour optique qu'à l'accueil `accueil.tsx`) — ses
// dernières ventes sont donc partagées avant que la caisse soit purgée.
//
// Contrairement au propriétaire (`DeleteShopCard`), l'employé ne touche JAMAIS à
// l'orchestrateur : `deleteShopRemote` effacerait le compte entier du commerce. Ici,
// tout est local : purge de la base, remise à zéro du gatekeeper, retour au premier
// lancement. Le mobile redevient une caisse à ré-appairer, sans rien détruire chez le
// propriétaire.
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
import { resetGatekeeper } from "@/lib/gatekeeper";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async () => {
      await purgeAllData();
      resetGatekeeper();
      savePreferences({ onboarded: false });
    },
    onSuccess: () => {
      toast.success("Compte supprimé — dernières ventes partagées au propriétaire.");
      window.location.reload();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  if (role !== "employee") return null;

  // Phase B : scan du QR de restitution du propriétaire, puis génération du QR de
  // clôture (aujourd'hui). Le QR affiché est présenté au propriétaire AVANT la
  // suppression — c'est la condition pour que l'effacement soit autorisé.
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
        Pour effacer cette caisse, vos dernières ventes doivent d'abord rejoindre le propriétaire :
        il vous présente son QR de restitution, vous en faites un QR de clôture, il le scanne. La
        suppression devient alors possible.
      </p>

      {!closingQrDataUrl ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={scanning}
          onClick={handleClosingScan}
        >
          <Lock className="h-4 w-4 mr-1" />
          {scanning ? "Scan en cours…" : "Scanner le QR de restitution"}
        </Button>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">{summary}</p>
          <p className="text-xs text-muted-foreground">
            Présentez ce QR au propriétaire (espace « Employés ») pour transférer vos ventes.
          </p>
          <img
            src={closingQrDataUrl}
            alt="QR de clôture"
            className="mx-auto h-44 w-44 border rounded-lg"
          />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer mon compte
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              setClosingQrDataUrl(null);
              setSummary(null);
            }}
          >
            Recommencer
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
