// Les deux dialogues de la page Comptabilité : le détail d'une journée, et la plage
// personnalisée. Extraits parce qu'ils pèsent 150 lignes pour deux responsibilities
// sans rapport (l'un lit une journée, l'autre saisit une plage) et que le shell d'assemblage
// doit rester lisible.

import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { formatDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DayDetailContent } from "./DayDetailContent";

export function DayDetailDialog({
  day,
  open,
  onOpenChange,
  isService,
  hasWeightInput,
}: {
  day: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isService: boolean;
  hasWeightInput: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ventes du {formatDay(day)}</DialogTitle>
        </DialogHeader>
        <DayDetailContent day={day} isService={isService} hasWeightInput={hasWeightInput} />
      </DialogContent>
    </Dialog>
  );
}

/** Plage libre : la navigation rapide (Mois/Semaine/Jour/Année) couvre l'usage courant,
 *  celle-ci reste pour un export ponctuel. */
export function RangeDialog() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="mr-2 h-4 w-4" /> Période personnalisée
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Période personnalisée</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="range-start" className="text-xs">
                Début
              </Label>
              <Input
                id="range-start"
                type="date"
                value={from ? new Date(from).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setFrom(e.target.value ? new Date(e.target.value + "T00:00:00").getTime() : null)
                }
              />
            </div>
            <div>
              <Label htmlFor="range-end" className="text-xs">
                Fin
              </Label>
              <Input
                id="range-end"
                type="date"
                value={to ? new Date(to).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setTo(
                    e.target.value
                      ? new Date(e.target.value + "T00:00:00").getTime() + 86400000
                      : null,
                  )
                }
                min={from ? new Date(from).toISOString().split("T")[0] : undefined}
              />
            </div>
            {from != null && to != null && to > from && (
              <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                Du {new Date(from).toLocaleDateString("fr-FR")} au{" "}
                {new Date(to - 86400000).toLocaleDateString("fr-FR")}
              </p>
            )}
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="mt-0.5 h-3 w-3 shrink-0" />
              Navigation rapide ci-dessus : Mois, Semaine, Jour et Année couvrent l'usage courant ;
              la plage libre reste pour un export ponctuel.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
