import { toast } from "sonner";

interface PairingCodeDisplayProps {
  pairCode: string | null;
  minutesLeft: number;
}

/** Affichage du code de appairage à 6 chiffres en gras, avec bouton "Copier". */
export function PairingCodeDisplay({ pairCode, minutesLeft }: PairingCodeDisplayProps) {
  return (
    <div className="space-y-2">
      {pairCode && (
        <div className="rounded-lg border border-dashed bg-accent/40 py-3 text-center">
          <p className="font-mono text-3xl font-bold tracking-[0.3em]">{pairCode}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(pairCode);
                toast.success("Code copié", {
                  description: `Code ${pairCode} copié dans le presse-papier`,
                });
              }}
              className="flex-1 py-1.5 px-3 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              aria-label="Copier le code"
            >
              Copier
            </button>
            <span className="text-xs text-muted-foreground">{minutesLeft} min restants</span>
          </div>
        </div>
      )}
      <p className="text-xs font-medium text-muted-foreground">
        L'employé scanne le QR, entre son nom puis ce code temporaire : il est ajouté à la boutique.
      </p>
    </div>
  );
}
