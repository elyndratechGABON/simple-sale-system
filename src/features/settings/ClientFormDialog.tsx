import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addClient, updateClient, type Client } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ClientFormDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Client | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const saveMut = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error("Nom requis");
      const payload = {
        name: n,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editing) await updateClient({ ...editing, ...payload });
      else await addClient(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(editing ? "Client mis à jour" : "Client ajouté");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="client-nom">Nom *</Label>
            <Input
              id="client-nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Mme Kombila"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="client-tel">Téléphone</Label>
            <Input
              id="client-tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <div>
            <Label htmlFor="client-notes">Notes</Label>
            <Input
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, préférences…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!name.trim() || saveMut.isPending}
            aria-busy={saveMut.isPending}
          >
            {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
