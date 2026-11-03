// ÉPURATION (mission scan employé) : après un scan réussi, le code de 6 caractères
// a DÉJÀ été annoncé depuis le QR — l'écran ne demande plus QUE le nom de l'employé.
// Pas de mot de passe, pas d'email.
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmployeeNameModal({
  name,
  onNameChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  onNameChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quel est votre nom ?"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Quel est votre nom ?</h3>
            <p className="text-xs text-muted-foreground">
              Vous êtes connecté à la boutique du propriétaire.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="emp-name">Votre nom</Label>
          <Input
            id="emp-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex : Jean Yves"
            autoComplete="name"
            autoFocus
            className="h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onSubmit}
            disabled={name.trim().length < 2}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
