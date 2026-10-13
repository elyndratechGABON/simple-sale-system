import { ChevronRight, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Actions : un seul CTA principal, une action secondaire (+ prestation optionnelle).
 *
 *  68 px au lieu de 76–84 : le CTA reste le plus visible de la page (fond plein,
 *  icône pleine) mais ne mange plus une ligne et demie.
 */
export function StocksActions({
  isService,
  onAdd,
  onJournal,
  onPrestation,
}: {
  isService: boolean;
  onAdd: () => void;
  onJournal: () => void;
  onPrestation: () => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <button
        type="button"
        onClick={onAdd}
        className="group flex h-[68px] min-w-0 w-full items-center gap-3 rounded-xl bg-primary px-3 text-left text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
          <Plus className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">Ajouter du stock</span>
          <span className="mt-0.5 block truncate text-xs text-primary-foreground/75">
            Enregistrer un nouveau produit
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-primary-foreground/70 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>

      <button
        type="button"
        onClick={onJournal}
        className="group flex h-[68px] min-w-0 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <History className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">Journal</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            Voir l'historique des mouvements
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>

      {isService && (
        <div className="flex md:col-span-2 md:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onPrestation}>
            <Plus className="h-4 w-4 mr-1.5" /> Prestation
          </Button>
        </div>
      )}
    </div>
  );
}
