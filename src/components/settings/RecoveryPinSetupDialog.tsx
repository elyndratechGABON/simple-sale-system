// Création / changement du CODE PIN DE RÉCUPÉRATION (mission sécurité — Étape 4.3),
// façonné sur PinSetupDialog (règle des 3 : la saisie PIN à 4 chiffres se répète
// exactement, les deux codes vivent différemment — énoncés distincts, logs distincts).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isRecoveryPinSet, setRecoveryPin } from "@/lib/recovery-pin";
import { toast } from "sonner";

export function RecoveryPinSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [hasPin, setHasPin] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setHasPin(isRecoveryPinSet());
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [open, hasPin]);

  async function enregistrer() {
    if (next.length !== 4 || !/^\d{4}$/.test(next)) {
      setError("4 chiffres exactement.");
      return;
    }
    if (next !== confirm) {
      setError("Les deux saisies ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await setRecoveryPin(next);
      toast.success("Code de récupération enregistré.");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Code PIN de récupération</DialogTitle>
          <DialogDescription asChild>
            <div>
              Saisi sur un TÉLÉPHONE NEUF, ce code rattache la boutique au compte et déconnecte
              l&apos;ancien appareil. Défaut&nbsp;: <b>0010</b> — à personnaliser.
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="recovery-pin">Nouveau code (4 chiffres)</Label>
            <Input
              id="recovery-pin"
              inputMode="numeric"
              value={next}
              onChange={(e) => setNext(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Ex : 8431"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="recovery-pin-confirm">Confirmer</Label>
            <Input
              id="recovery-pin-confirm"
              inputMode="numeric"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && next && !busy) void enregistrer();
              }}
            />
          </div>
          {error && <p className="text-small text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => void enregistrer()} disabled={busy || next.length !== 4}>
            {hasPin ? "Changer le code" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
