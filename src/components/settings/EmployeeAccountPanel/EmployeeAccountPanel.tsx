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
import { ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmployeeAccount } from "./useEmployeeAccount";
import { ProfileStockCard } from "./ProfileStockCard";
import { DeleteAskDialog } from "./DeleteAskDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

export function EmployeeAccountPanel() {
  const account = useEmployeeAccount();
  if (account.role !== "employee") return null;
  const {
    error,
    summary,
    setSummary,
    closingQrDataUrl,
    setClosingQrDataUrl,
    choiceOpen,
    setChoiceOpen,
    immediateOpen,
    setImmediateOpen,
    confirmOpen,
    setConfirmOpen,
    deleteMut,
  } = account;

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Mon compte</h3>
      <p className="text-sm text-muted-foreground">
        Pour supprimer ce compte, le plus simple est d'envoyer une demande au propriétaire : il
        décide depuis son tableau de bord. Vous pouvez aussi présenter son QR de restitution. La
        suppression n'efface que <strong>cet appareil</strong> (ventes, produits, historique) et
        fait repartir l'application au premier lancement — le compte marchand n'est jamais touché.
      </p>

      <ProfileStockCard account={account} />

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
      <DeleteAskDialog account={account} open={choiceOpen} onOpenChange={setChoiceOpen} />

      {/* Suppression immédiate : confirmation directe (aucun serveur requis) */}
      <DeleteConfirmDialog
        open={immediateOpen}
        onOpenChange={setImmediateOpen}
        title="Éjecter cet appareil du compte ?"
        isPending={deleteMut.isPending}
        onConfirm={() => {
          setImmediateOpen(false);
          deleteMut.mutate();
        }}
        description={
          <div className="space-y-2">
            <p>
              Les données locales <strong>de cet appareil</strong> seront{" "}
              <strong>définitivement effacées</strong> : ventes, produits et historique. Le compte
              du propriétaire reste intact.
            </p>
            <p className="text-sm text-muted-foreground">
              L'application repart au premier lancement. Action immédiate, sans validation du
              propriétaire.
            </p>
          </div>
        }
      />

      {/* Confirmation finale (après QR de clôture) */}
      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer ce compte employé ?"
        isPending={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        description={
          <div className="space-y-2">
            <p>
              Les ventes de cette caisse sont désormais chez le propriétaire. Les données locales{" "}
              <strong>de cet appareil</strong> seront <strong>définitivement effacées</strong> :
              ventes, produits et historique. Aucune donnée du compte marchand n'est touchée.
            </p>
            <p className="text-sm text-muted-foreground">
              L'application repart au premier lancement.
            </p>
          </div>
        }
      />
    </div>
  );
}
