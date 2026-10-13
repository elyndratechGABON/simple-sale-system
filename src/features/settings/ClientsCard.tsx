import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { deleteClient, listClients, type Client } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClientFormDialog } from "./ClientFormDialog";

export function ClientsCard() {
  const qc = useQueryClient();
  const { cluster } = usePreferences();
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const removeMut = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé");
    },
  });

  if (cluster !== "service") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Clients
        </CardTitle>
        <CardDescription>
          Registre de vos clients. Sélectionnez un nom en caisse pour suivre l'historique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clients.length > 0 && (
          <div className="space-y-1">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  {/* `truncate` sur le BLOC (un span inline n'ellipsis pas) : une
                      note longue reste sur une ligne coupée au lieu de pousser
                      la carte en largeur. */}
                  <div className="truncate text-xs text-muted-foreground">
                    {c.phone && <span>{c.phone}</span>}
                    {c.phone && c.notes && <span> · </span>}
                    {c.notes && <span>{c.notes}</span>}
                    {!c.phone && !c.notes && (
                      <span className="text-muted-foreground/60">Pas de détails</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 sm:h-9 sm:w-9"
                    aria-label={`Modifier ${c.name}`}
                    onClick={() => {
                      setEditing(c);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 sm:h-9 sm:w-9"
                    aria-label={`Supprimer ${c.name}`}
                    onClick={() => {
                      if (confirm(`Supprimer "${c.name}" ?`)) removeMut.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun client enregistré. Ajoutez vos clients réguliers pour suivre leur historique.
          </p>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nouveau client
        </Button>

        {/* `key` force un remontage par client ciblé : le formulaire relit `editing`
            une seule fois, à l'ouverture, au lieu de garder les valeurs précédentes. */}
        <ClientFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
