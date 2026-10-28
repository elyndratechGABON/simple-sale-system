import { ChevronRight, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Actions : deux CTA principaux côte à côte (même hauteur, même largeur),
 *  puis actions secondaires.
 */
export function StocksActions({
  isService,
  onAdd,
  onJournal,
  onCreate,
  onPrestation,
}: {
  isService: boolean;
  onAdd: () => void;
  onJournal: () => void;
  onCreate: () => void;
  onPrestation: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* Ligne 1 : CTA principaux - même hauteur, même largeur */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="group flex-1 flex h-[68px] min-w-0 items-center gap-3 rounded-xl bg-primary px-3 text-left text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
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
          onClick={onCreate}
          className="group flex-1 lg:flex-[1.4] flex h-[68px] min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Plus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">Créer un produit</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              Nouveau produit dans le catalogue
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </button>
      </div>

      {/* Ligne 2 : Actions secondaires */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onJournal}
          className="group flex-1 flex h-[68px] min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
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
          <button
            type="button"
            onClick={onPrestation}
            className="group flex-1 flex h-[68px] min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">Prestation</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                Créer une nouvelle prestation
              </span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        )}
      </div>
    </div>
  );
}
