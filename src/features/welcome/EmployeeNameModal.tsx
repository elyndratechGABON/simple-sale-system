// ÉPURATION (mission scan employé) : l'écran de scan n'accepte QUE le code de 6
// caractères affiché sous le QR du patron — pas de nom, pas de numéro, pas de mot
// de passe. Un seul champ, un seul geste, et l'employé est dans la boutique.
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normPairCode } from "@/lib/syncengine/pairing";

export function EmployeeNameModal({
  code,
  onCodeChange,
  onCancel,
  onSubmit,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rejoindre l'équipe"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Rejoindre l&apos;équipe</h3>
            <p className="text-xs text-muted-foreground">
              Saisissez le code affiché sur la caisse du propriétaire.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="emp-code">Code de la boutique (6 caractères)</Label>
          <Input
            id="emp-code"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="A B C 1 2 3"
            autoFocus
            className="h-16 text-center text-2xl font-mono font-bold tracking-widest uppercase"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
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
          <Button className="flex-1" onClick={onSubmit} disabled={normPairCode(code).length !== 6}>
            Rejoindre
          </Button>
        </div>
      </div>
    </div>
  );
}
