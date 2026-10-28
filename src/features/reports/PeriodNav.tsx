import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_LABEL, VIEWS, type CalendarView, periodTitle, stepDay } from "@/lib/reports/period";

interface PeriodNavProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  focusedDay: number;
  onFocusedDayChange: (ts: number) => void;
}

/**
 * La période affichée : 4 granularités + la navigation d'une période à l'autre.
 *
 * UN SEUL endroit pour choisir « ce que regarde l'écran ». Les onglets Données et
 * Bénéfice partagent ce composant ET son état (porté par la page) : dupliqué, ils
 * pourraient afficher deux périodes différentes sur le même écran, et deux chiffres
 * qui ne se recoupent pas.
 */
export function PeriodNav({ view, onViewChange, focusedDay, onFocusedDayChange }: PeriodNavProps) {
  return (
    <div className="space-y-2">
      {/* Granularité : quatre choix, l'actif au vert principal. */}
      <Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
        <TabsList className="grid w-full grid-cols-4">
          {VIEWS.map((v) => (
            <TabsTrigger key={v.value} value={v.value} className="text-xs sm:text-sm">
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="h-11 w-11 sm:h-10 sm:w-10"
          aria-label={`${NAV_LABEL[view]} précédent`}
          onClick={() => onFocusedDayChange(stepDay(focusedDay, view, -1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold tabular-nums sm:text-lg">
          {periodTitle(focusedDay, view)}
        </h2>
        <Button
          variant="ghost"
          className="h-11 w-11 sm:h-10 sm:w-10"
          aria-label={`${NAV_LABEL[view]} suivant`}
          onClick={() => onFocusedDayChange(stepDay(focusedDay, view, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
