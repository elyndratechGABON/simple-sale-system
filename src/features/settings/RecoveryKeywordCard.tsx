import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { getShopProfile } from "@/lib/db";
import { Button } from "@/components/ui/button";

/**
 * Carte PREMIUM du CODE DE RÉCUPÉRATION — le mot clé généré PAR LE SERVEUR à la création
 * du compte (format `XXXX-XXXX`), stocké dans `shop_profiles.me.accountKeyword` depuis
 * l'écran créateur. C'est la clé qui rattache une caisse NEUVE (téléphone perdu) au
 * compte : le patron doit pouvoir la RECONFISSER ici, mais aussi la poser sur son
 * écran Système pour ne jamais la perdre. Patron seulement — l'onglet est déjà
 * filtré par rôle dans `SettingsPage`.
 */
export function RecoveryKeywordCard() {
  const { data: profile } = useQuery({ queryKey: ["shop_profile"], queryFn: getShopProfile });
  const [revealed, setRevealed] = useState(false);
  const keyword = profile?.accountKeyword?.trim() ?? "";

  function copy() {
    if (!keyword || !revealed) return;
    void navigator.clipboard.writeText(keyword).then(() => toast.success("Code copié"));
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-md md:col-span-2"
      aria-label="Code de récupération du compte"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-title flex items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
              <KeyRound className="h-5 w-5" />
            </span>
            Code de récupération
          </h2>
          <p className="text-small text-muted-foreground">
            Généré à la création du compte, il reconnecte vos futures caisses — même après un
            téléphone perdu. Conservez-le précieusement : c&apos;est la clé du compte.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {keyword ? (
          <>
            <code
              className={
                revealed
                  ? "rounded-lg bg-card px-4 py-2.5 font-mono text-xl font-bold tracking-[0.25em] text-foreground shadow-inner"
                  : "rounded-lg bg-card px-4 py-2.5 font-mono text-xl font-bold tracking-[0.25em] text-primary shadow-inner"
              }
            >
              {revealed ? keyword : "••••-••••"}
            </code>
            <Button
              size="icon"
              variant="ghost"
              aria-label={revealed ? "Masquer le code" : "Révéler le code"}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {revealed && (
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-4 w-4 mr-1.5" /> Copier
              </Button>
            )}
          </>
        ) : (
          <p className="text-small text-muted-foreground">
            Aucun code sur cet appareil — il a été remis UNE fois à l&apos;écran qui a créé le
            compte.
          </p>
        )}
      </div>
    </div>
  );
}
