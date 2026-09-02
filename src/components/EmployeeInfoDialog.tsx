import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRound } from "lucide-react";

export function EmployeeInfoDialog({
  open,
  onOpenChange,
  peerName = "",
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  peerName?: string;
  onSave: (info: { firstName: string; lastName: string; phone: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  function submit() {
    if (!firstName.trim() || !lastName.trim()) return;
    onSave({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
    setFirstName("");
    setLastName("");
    setPhone("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-5 w-5" />
            Informations employé
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Appareil associé :{" "}
            <span className="font-medium text-foreground">{peerName || "—"}</span>
          </p>
          <p className="text-xs">Ces informations apparaissent sur l'écran du propriétaire.</p>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="emp-fn">Prénom</Label>
            <Input
              id="emp-fn"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nom"
            />
          </div>
          <div>
            <Label htmlFor="emp-ln">Nom</Label>
            <Input
              id="emp-ln"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Prénom"
            />
          </div>
          <div>
            <Label htmlFor="emp-phone">Téléphone</Label>
            <Input
              id="emp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button size="sm" onClick={submit} disabled={!firstName.trim() || !lastName.trim()}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
