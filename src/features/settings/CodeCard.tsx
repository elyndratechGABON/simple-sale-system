import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Carte CODE PREMIUM (onglet Système) — le design unique des secrets que le patron
 * garde précieusement : fond vert clair dégradé, icône clé, code masqué derrière un
 * œil de révélation, bouton Copier. Deux usages : le code de RÉCUPÉRATION du compte
 * et le PIN d'ANNULATION — même apparence, mêmes règles de visite (masqué par défaut,
 * révélation volontaire, copie explicite).
 */
export function CodeCard({
  title,
  description,
  warning,
  code,
  unavailableMessage,
  copyable = false,
  action,
}: {
  title: string;
  description: ReactNode;
  /** Note destructive sous la description (code à conserver précieusement…). */
  warning?: ReactNode;
  /** Le code protégé, ou `null`/vide si l'appareil n'en détient aucun. */
  code?: string | null;
  /** Phrase de remplacement quand `code` est vide. */
  unavailableMessage: string;
  /** Copie offerte UNIQUEMENT quand le code est une vraie valeur remise par l'app. */
  copyable?: boolean;
  /** Action libre à côté du code (ex : « Changer »). */
  action?: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const masque = code ? "•".repeat(code.length) : "••••";

  function copy() {
    if (!code || !revealed) return;
    void navigator.clipboard.writeText(code).then(() => toast.success("Code copié"));
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-md md:col-span-2"
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-title flex items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
              <KeyRound className="h-5 w-5" />
            </span>
            {title}
          </h2>
          <p className="text-small text-muted-foreground">{description}</p>
          {warning && <p className="text-small text-destructive">⚠️ {warning}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {code ? (
          <>
            <code
              className={cn(
                "rounded-lg bg-card px-4 py-2.5 font-mono text-xl font-bold tracking-[0.25em] shadow-inner",
                revealed ? "text-foreground" : "text-primary",
              )}
            >
              {revealed ? code : masque}
            </code>
            <Button
              size="icon"
              variant="ghost"
              aria-label={revealed ? "Masquer le code" : "Révéler le code"}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {copyable && revealed && (
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-4 w-4 mr-1.5" /> Copier
              </Button>
            )}
          </>
        ) : (
          <p className="text-small text-muted-foreground">{unavailableMessage}</p>
        )}
        {action}
      </div>
    </div>
  );
}
