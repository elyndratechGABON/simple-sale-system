import { ScanLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepShell } from "../StepShell";
import type { SetupWizardApi } from "../useSetupWizard";

export function AccountStep({ w }: { w: SetupWizardApi }) {
  return (
    <StepShell
      icon={Users}
      title={w.accountMode === "create" ? "Créer un compte" : "Identifiants du compte"}
      description={
        w.accountMode === "create"
          ? "Dernière étape : sécurisez votre boutique avec un téléphone et un mot de passe."
          : "Téléphone + mot de passe (ou scannez le QR du propriétaire / entrez le code temporaire)."
      }
    >
      <div className="space-y-3">
        {w.accountMode === "join" && (
          <>
            <Button type="button" className="w-full gap-2" onClick={() => void w.scanPairingQr()}>
              <ScanLine className="h-4 w-4" /> Scanner le QR du propriétaire
            </Button>
            <Input
              value={w.pairCode}
              onChange={(e) => w.setPairCode(e.target.value.toUpperCase())}
              placeholder="Code temporaire (6 caractères)"
              className="h-12 font-mono tracking-widest"
              maxLength={6}
              autoComplete="off"
            />
          </>
        )}
        <div>
          <Label htmlFor="ob-acc-phone">Téléphone du compte</Label>
          <Input
            id="ob-acc-phone"
            type="tel"
            value={w.accPhone}
            onChange={(e) => w.setAccPhone(e.target.value)}
            placeholder="+241 06 123 456"
            className="h-12"
          />
        </div>
        <div>
          <Label htmlFor="ob-acc-pass">Mot de passe</Label>
          <Input
            id="ob-acc-pass"
            type="password"
            value={w.accPassword}
            onChange={(e) => w.setAccPassword(e.target.value)}
            placeholder={
              w.accountMode === "join" ? "Mot de passe du compte" : "4 caractères minimum"
            }
            className="h-12"
          />
        </div>
        <div>
          <Label htmlFor="ob-owner">Nom du propriétaire</Label>
          <Input
            id="ob-owner"
            value={w.ownerName}
            onChange={(e) => w.setOwnerName(e.target.value)}
            placeholder="Ex : Migolet Jean Yves"
            className="h-12"
          />
        </div>
      </div>
    </StepShell>
  );
}
