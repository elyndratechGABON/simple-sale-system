// Création / changement du code PIN d'annulation, dans les Paramètres. Distinct de
// `PinDialog` (qui ne fait que VÉRIFIER devant une action) : ici on pose le code, avec
// son ancien pour le remplacer quand il y en a déjà un.
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
import { isPinSet, setPin, verifyPin } from "@/lib/pin";
import { toast } from "sonner";

export function PinSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [hasPin, setHasPin] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setHasPin(isPinSet());
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (busy) return;
    setError(null);
    if (next.trim().length < 4) {
      setError("Le nouveau code doit faire au moins 4 caractères.");
      return;
    }
    if (next !== confirm) {
      setError("Les deux saisies ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      // Remplacer un code existant exige l'ancien : sans cette preuve, une main posée
      // sur l'appareil unattended pourrait remplacer le code et annuler librement.
      if (hasPin) {
        const result = await verifyPin(current);
        if (result !== "ok") {
          setError(
            result === "locked"
              ? "Trop de tentatives. Réessayez dans quelques minutes."
              : "Code PIN actuel incorrect.",
          );
          return;
        }
      }
      await setPin(next.trim());
      toast.success("Code PIN enregistré");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasPin ? "Changer le code PIN" : "Créer un code PIN"}</DialogTitle>
          <DialogDescription>
            Ce code sera demandé avant chaque annulation de vente ou de table.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {hasPin && (
            <div>
              <Label htmlFor="pin-current">Code actuel</Label>
              <Input
                id="pin-current"
                type="password"
                inputMode="numeric"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div>
            <Label htmlFor="pin-new">{hasPin ? "Nouveau code" : "Code"}</Label>
            <Input
              id="pin-new"
              type="password"
              inputMode="numeric"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoFocus={!hasPin}
            />
          </div>
          <div>
            <Label htmlFor="pin-confirm">Répéter le code</Label>
            <Input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !next || !confirm}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
