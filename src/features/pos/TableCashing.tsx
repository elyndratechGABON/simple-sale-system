import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFCFA, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QUICK_AMOUNTS } from "./pos-constants";
import type { PosController } from "./usePos";

/**
 * Encaissement SUR TABLE uniquement : apparaît après avoir choisi sa cible — « Encaisser »
 * pour toute l'addition, « Encaisser cette tournée » pour une seule. Au comptoir, l'argent
 * se saisit dans le dialogue d'encaissement (cf. CheckoutDialog).
 */
export function TableCashing({ pos }: { pos: PosController }) {
  if (!pos.activeTable || !pos.cashing) return null;
  return (
    <>
      {pos.cashing.kind === "round" && pos.cashingRound && (
        <p className="text-sm font-medium text-muted-foreground">
          Tournée de {formatTime(pos.cashingRound[0])} — {formatFCFA(pos.dueNow)} à encaisser
        </p>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="cash-given">
          Argent donné
        </label>
        <Input
          id="cash-given"
          inputMode="numeric"
          value={pos.cashGiven}
          onChange={(e) => pos.setCashGiven(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
          className="h-14 text-2xl text-right font-bold tabular-nums"
        />
        <div className="flex flex-wrap gap-1">
          {QUICK_AMOUNTS.map((amt) => (
            <Button
              key={amt}
              variant="secondary"
              size="sm"
              onClick={() => pos.setCashGiven(String((Number(pos.cashGiven) || 0) + amt))}
            >
              +{formatFCFA(amt)}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => pos.setCashGiven("")}>
            Vider
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg p-4 flex items-center justify-between",
          pos.insufficient ? "bg-destructive/10" : "bg-accent",
        )}
      >
        <span className="font-semibold">{pos.insufficient ? "Manque" : "Monnaie à rendre"}</span>
        <span
          className={cn(
            "text-3xl font-bold tabular-nums",
            pos.insufficient ? "text-destructive" : "text-primary",
          )}
        >
          {formatFCFA(Math.abs(pos.change))}
        </span>
      </div>
      {pos.insufficient && (
        <p className="text-sm text-destructive">
          Montant insuffisant. Demander au moins {formatFCFA(pos.dueTotal)}.
        </p>
      )}
    </>
  );
}
