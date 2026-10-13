import { ArrowRight, CheckCircle2, Download, Loader2, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EmployeeAccount } from "./useEmployeeAccount";

/** Carte « Profil et stock » : nom/numéro modifiables + import du catalogue propriétaire. */
export function ProfileStockCard({ account }: { account: EmployeeAccount }) {
  const {
    employeeName,
    setEmployeeName,
    employeePhone,
    setEmployeePhone,
    identity,
    importPhase,
    importResult,
    importMut,
    saveName,
    savePhone,
  } = account;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Profil et stock</h3>
      <div className="space-y-1.5">
        <Label htmlFor="emp-name">Nom de l'employé</Label>
        <div className="flex gap-2">
          <Input
            id="emp-name"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Votre nom affiché sur la caisse"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!employeeName.trim() || employeeName.trim() === identity?.employeeName}
            onClick={() => void saveName()}
          >
            <UserRound className="h-4 w-4 mr-1" />
            OK
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emp-phone">Numéro de téléphone</Label>
        <div className="flex gap-2">
          <Input
            id="emp-phone"
            type="tel"
            inputMode="tel"
            value={employeePhone}
            onChange={(e) => setEmployeePhone(e.target.value)}
            placeholder="Pour que le propriétaire vous joigne"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!employeePhone.trim() || employeePhone.trim() === identity?.employeePhone}
            onClick={() => void savePhone()}
          >
            <Phone className="h-4 w-4 mr-1" />
            OK
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
        <p className="text-sm font-medium text-foreground">Stock du propriétaire</p>
        <p className="text-xs text-muted-foreground">
          Rapatrie le catalogue (produits + niveaux de stock) publié par la caisse propriétaire via
          le relais, sans envoyer de mot de passe. Le propriétaire doit avoir été en ligne au moins
          une fois pour que ses produits y figurent.
        </p>
      </div>

      {importPhase !== null && (
        <div className="rounded-lg border bg-card p-3 space-y-2" aria-live="polite">
          {importPhase === "done" ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">
                Stock transféré — {importResult?.count ?? 0} produit(s) en caisse
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground">
                <span
                  className={
                    importPhase === "relay" || importPhase === "receiving" ? "text-foreground" : ""
                  }
                >
                  {importPhase === "relay" ? "Connexion au relais…" : "Propriétaire"}
                </span>
                <span className={importPhase === "receiving" ? "text-foreground" : ""}>
                  {importPhase === "waiting" ? "En attente de réponse…" : "Réception"}
                </span>
              </div>
              {/* Barre de transfert animée : le point parcourt le fil Propriétaire → relais → caisse. */}
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "absolute h-full w-1/3 rounded-full bg-primary transition-all duration-700 ease-in-out",
                    importPhase === "relay" && "left-0 animate-pulse",
                    importPhase === "waiting" && "left-1/3",
                    importPhase === "receiving" && "left-2/3",
                  )}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Propriétaire</span>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Relais</span>
                <ArrowRight className="h-3 w-3" />
                <span>Cet écran</span>
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        className="w-full"
        disabled={importMut.isPending}
        onClick={() => importMut.mutate()}
      >
        {importMut.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Transfert du stock en cours…
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1" />
            Importer le stock du propriétaire
          </>
        )}
      </Button>
    </div>
  );
}
