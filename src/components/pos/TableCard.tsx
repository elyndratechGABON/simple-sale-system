// Plan de salle simplifié : une carte par table, deux états possibles — libre ou occupée.
// Une table libre n'a pas d'addition ; une table occupée a une addition ouverte (status: "open").
// L'état passe par la couleur et le montant — pas par un cycle de service.
//
// Occupée, la carte vit (mission cartes de tables) :
//   - badge « N tournées » (groupes d'items par ordered_at) ;
//   - rangée d'avatars des produits consommés (3 max + « +X ») ;
//   - bouton « Encaisser » qui ouvre DIRECTEMENT le paiement de la table, sans
//     passer par le menu de tap ni la liste des factures en cours.

import { useRef } from "react";
import { CreditCard, Layers } from "lucide-react";
import type { Sale } from "@/lib/db";
import { formatFCFA, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LONG_PRESS_MS } from "@/lib/pos/types";
import type { TableVisualInfo } from "@/features/pos/usePosData";

const MAX_AVATARS = 3;

export function TableCard({
  label,
  table,
  active,
  disabled,
  onClick,
  onLongPress,
  info,
  onEncaisser,
}: {
  label: string;
  table: Sale | null;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  /** Tournées + produits consommés (par la requête des tables ouvertes). */
  info?: TableVisualInfo;
  /** Encaissement direct : checkout de la liste « Factures en cours ». */
  onEncaisser?: () => void;
}) {
  const busy = table !== null;
  const timer = useRef<number | null>(null);
  // Le `pointerup` qui suit un appui long déclenche aussi le `click` : sans ce drapeau,
  // libérer une table la rouvrirait dans la foulée.
  const fired = useRef(false);

  function stop() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  const avatars = info?.products ?? [];
  const rounds = info?.rounds ?? 0;
  const surplus = avatars.length - MAX_AVATARS;

  return (
    <div
      className={cn(
        "select-none [-webkit-touch-callout:none]",
        "relative flex min-h-[72px] flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
        "hover:border-primary",
        busy ? "border-orange-300 bg-orange-50" : "border-border bg-card",
        active && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (fired.current) return;
          onClick();
        }}
        onPointerDown={() => {
          fired.current = false;
          if (!onLongPress) return;
          timer.current = window.setTimeout(() => {
            fired.current = true;
            onLongPress();
          }, LONG_PRESS_MS);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        // Sur téléphone, un appui long ouvre sinon le menu contextuel du navigateur
        // par-dessus le plan de salle.
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-pressed={active}
        aria-label={
          !busy
            ? `Table ${label}, libre`
            : table.total > 0
              ? `Table ${label}, occupée, ${formatFCFA(table.total)} à encaisser${rounds > 0 ? `, ${rounds} tournée${rounds > 1 ? "s" : ""}` : ""}`
              : `Table ${label}, occupée. Appui long pour libérer.`
        }
        className={cn(
          "flex w-full flex-col gap-1 rounded-md text-left",
          !disabled && "active:scale-[0.98]",
          !busy && disabled && "cursor-default",
        )}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-semibold leading-tight text-foreground">
            {label}
          </span>
          {busy && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
        </span>
        {!busy ? (
          <span className="text-xs leading-tight text-muted-foreground">Libre</span>
        ) : (
          <>
            <span className="flex items-center justify-between gap-1">
              <span className="font-bold leading-tight text-orange-700 tabular-nums">
                {formatFCFA(table.total)}
              </span>
              {/* Tournées : le compteur distingue « consommé et parti » de « encore au
                  bar » — l'info du service, pas une métadonnée. */}
              {rounds > 1 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                  <Layers className="h-3 w-3" />
                  {rounds} tourn{rounds > 1 ? "ées" : "ée"}
                </span>
              )}
            </span>
            {(avatars.length > 0 || table.opened_at) && (
              <span className="flex items-center justify-between gap-2 pt-0.5">
                {/* Avatars : 3 images + un « +X » pour le reste, chevauchés (-ml-2). */}
                {avatars.length > 0 && (
                  <span className="flex items-center">
                    {avatars.slice(0, MAX_AVATARS).map((p) => (
                      <span
                        key={p.id}
                        title={p.name}
                        className={cn(
                          "h-6 w-6 overflow-hidden rounded-full border-2 border-background bg-muted",
                          "-ml-2 first:ml-0",
                        )}
                      >
                        {p.photo ? (
                          <img
                            src={p.photo}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-muted-foreground">
                            {p.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </span>
                    ))}
                    {surplus > 0 && (
                      <span className="-ml-2 flex h-6 items-center justify-center rounded-full border-2 border-background bg-muted px-1 text-[10px] font-bold text-muted-foreground">
                        +{surplus}
                      </span>
                    )}
                  </span>
                )}
                <span
                  className={cn(
                    "text-xs leading-tight text-orange-600",
                    avatars.length === 0 && "ml-auto",
                  )}
                >
                  {table.opened_at ? formatTime(table.opened_at) : "occupée"}
                </span>
              </span>
            )}
          </>
        )}
      </button>

      {/* Encaissement direct : la même action que la liste « Factures en cours », un tap
          de moins pour le moment de payer — le geste de fin de service. */}
      {onEncaisser && table !== null && table.total > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEncaisser();
          }}
          aria-label={`Encaisser la table ${label} — ${formatFCFA(table.total)}`}
          title="Encaisser maintenant"
          className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CreditCard className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
