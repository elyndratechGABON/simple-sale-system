import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Utensils, X } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { savePreferences } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Libellés de tables proposés à la caisse.
 *
 * La liste s'étend aussi toute seule : ouvrir une table sous un nom inconnu depuis la
 * caisse l'ajoute ici. Cet écran sert à la mettre en ordre, pas à la construire.
 */
export function TablesCard({ disabled = false }: { disabled?: boolean }) {
  const qc = useQueryClient();
  const { tables } = usePreferences();
  const [draft, setDraft] = useState("");

  function commit(next: string[]) {
    savePreferences({ tables: next });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  return (
    <Card className={disabled ? "opacity-50" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="h-4 w-4" /> Tables
        </CardTitle>
        <CardDescription>
          Proposées à l'ouverture d'une addition. Retirer une table d'ici ne touche à aucune vente
          déjà enregistrée.
        </CardDescription>
      </CardHeader>
      {disabled && (
        <div className="mb-2 px-1 py-1.5 rounded-lg bg-muted/50 border text-sm text-muted-foreground flex items-center gap-2">
          <span>Plan de salle désactivé — </span>
          <span className="font-medium">Activez-le dans « Type de commerce »</span> pour gérer les
          tables.
        </div>
      )}
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pl-3 pr-1 text-sm"
            >
              {t}
              {/* Cible 44px débordant visuellement de la pastille (-m) : le
                  geste destructeur le plus petit de l'app était un 24×24. */}
              <Button
                size="icon"
                variant="ghost"
                className="-mr-2 -my-2.5 h-11 w-11 rounded-full text-muted-foreground hover:text-destructive sm:-mr-1.5 sm:-my-1 sm:h-8 sm:w-8"
                aria-label={`Retirer la table ${t}`}
                onClick={() => commit(tables.filter((x) => x !== t))}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="table-new">Ajouter une table</Label>
            <Input
              id="table-new"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex : Terrasse 1"
              onKeyDown={(e) => {
                if (e.key === "Enter") addTable();
              }}
              disabled={disabled}
            />
          </div>
          <Button onClick={addTable} disabled={disabled}>
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  function addTable() {
    const clean = draft.trim();
    if (!clean) {
      toast.error("Nom de table requis");
      return;
    }
    if (tables.includes(clean)) {
      toast.error(`« ${clean} » est déjà dans la liste`);
      return;
    }
    commit([...tables, clean]);
    setDraft("");
    toast.success(`Table ${clean} ajoutée`);
  }
}
