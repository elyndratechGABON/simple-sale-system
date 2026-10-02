// Dialog PIN partagé — la garde devant les actions qui coûtent de l'argent
// (annuler une vente encaissée, annuler une table). Un seul endroit gère les quatre
// issues possibles de `verifyPin` : `ok`, `wrong`, `locked`, `unset`. Les deux
// appelants n'ont plus qu'à le poser.
import { useState } from "react";
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
import { setPin, verifyPin, type PinResult } from "@/lib/pin";
import { toast } from "sonner";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ce que le code autorise, énoncé en clair : l'écran doit dire pourquoi il le demande. */
  description: string;
  onConfirm: () => void;
}

/** Message d'issue, en un seul endroit. */
function message(result: PinResult): { text: string; locked: boolean } | null {
  switch (result) {
    case "wrong":
      return { text: "Code PIN incorrect.", locked: false };
    case "locked":
      return { text: "Trop de tentatives. Réessayez dans quelques minutes.", locked: true };
    case "unset":
      return { text: "Aucun code PIN n'est défini sur cette caisse. Créez-en un.", locked: false };
    default:
      return null;
  }
}

export function PinDialog({ open, onOpenChange, description, onConfirm }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [busy, setBusy] = useState(false);

  function close() {
    setPin("");
    setError(null);
    setNeedsSetup(false);
    onOpenChange(false);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      // Première utilisation : aucun code n'existe, on en crée un plutôt que de refuser.
      if (needsSetup) {
        if (pin.trim().length < 4) {
          setError("Le code doit faire au moins 4 caractères.");
          return;
        }
        await setPin(pin.trim());
        toast.success("Code PIN défini");
        close();
        onConfirm();
        return;
      }

      const result = await verifyPin(pin);
      if (result === "ok") {
        close();
        onConfirm();
        return;
      }
      if (result === "unset") {
        // Cas inattendu — l'appelant a ouvert le dialogue alors qu'aucun code n'existe.
        setNeedsSetup(true);
        setError("Aucun code PIN n'est défini sur cette caisse. Créez-en un.");
        return;
      }
      setPin("");
      const m = message(result);
      setError(m?.text ?? "Code PIN incorrect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {needsSetup ? "Créer un code PIN" : "Confirmation par code PIN"}
          </DialogTitle>
          <DialogDescription>
            {needsSetup
              ? "Ce code sera demandé avant chaque annulation. Choisissez-le maintenant."
              : description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!needsSetup && <p className="text-sm text-muted-foreground">{description}</p>}
          <div>
            <Label htmlFor="pin-dialog-input">{needsSetup ? "Nouveau code" : "Code PIN"}</Label>
            <Input
              id="pin-dialog-input"
              type="password"
              inputMode={needsSetup ? "text" : "numeric"}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              autoFocus
              disabled={busy}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={busy || !pin}>
            {needsSetup ? "Créer et confirmer" : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
