import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normPairCode } from "@/lib/syncengine/pairing";

/** Modal du nom de l'employé — affiché après le scan QR du propriétaire. */
export function EmployeeNameModal({
  name,
  phone,
  code,
  onNameChange,
  onPhoneChange,
  onCodeChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  phone: string;
  code: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Nom de l'équipe"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Rejoindre l'équipe</h3>
            <p className="text-xs text-muted-foreground">
              Le compte employé est connecté au magasin du propriétaire.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="emp-name">Votre nom (pour l'équipe)</Label>
          <Input
            id="emp-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex : Jean Yves"
            className="h-12 text-base"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
          />
        </div>
        <div>
          <Label htmlFor="emp-phone">Votre numéro (facultatif)</Label>
          <Input
            id="emp-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Pour que le propriétaire vous joigne"
            className="h-12 text-base"
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="emp-code">Mot de passe temporaire (sous le QR)</Label>
          <Input
            id="emp-code"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="6 caractères"
            className="h-12 text-base font-mono tracking-widest"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Le code de 6 caractères visible sur le téléphone du propriétaire, en dessous de son code
            QR.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onSubmit}
            disabled={!name.trim() || normPairCode(code).length !== 6}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
