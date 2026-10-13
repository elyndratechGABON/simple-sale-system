interface PairingCodeDisplayProps {
  pairCode: string | null;
  minutesLeft: number;
}

export function PairingCodeDisplay({ pairCode, minutesLeft }: PairingCodeDisplayProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        L'employé scanne le QR, entre son nom puis le mot de passe temporaire ci-dessous : il est
        ajouté à la boutique.
      </p>
      {pairCode && (
        <div className="rounded-lg border border-dashed bg-accent/40 py-3 text-center">
          <p className="font-mono text-3xl font-bold tracking-[0.3em]">{pairCode}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mot de passe temporaire, valable {minutesLeft} min — à saisir par l'employé sous son
            nom.
          </p>
        </div>
      )}
    </div>
  );
}
