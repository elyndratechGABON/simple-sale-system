// Affiche les messages reçus via la boîte aux lettres (`broadcast_message`) et les
// consomme : chaque message ne sort qu'une fois, même si l'application n'était pas
// ouverte à la réception.
//
// S'y ajoutent deux états du mot clé de récupération (v3) :
//  - une réclamation en attente (serveur muet à la soumission) → bandeau « vérification
//    sous 48 h », levé par le handshake réussi ;
//  - un mot clé fraîchement reçu à la création → carte de sauvegarde À NE PAS RATER,
//    affichée une seule fois (« J'ai noté »).
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldAlert } from "lucide-react";
import {
  ackKeywordReveal,
  consumeMessages,
  getKeywordClaim,
  getKeywordToReveal,
  type KeywordClaim,
} from "@/lib/gatekeeper";
import { Button } from "@/components/ui/button";

function formatKeyword(keyword: string): string {
  const k = keyword.replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, "");
  return k.length > 4 ? `${k.slice(0, 4)}-${k.slice(4)}` : k;
}

export function GatekeeperAlerts() {
  useEffect(() => {
    void consumeMessages().then((messages) => {
      for (const message of messages) toast(message.text);
    });
  }, []);

  // Réclamation + mot clé à révéler sont posés côté IndexedDB (par le handshake de fond),
  // donc retrouvés par un petit poll — pas de store partagé nécessaire.
  const [claim, setClaim] = useState<KeywordClaim | null>(null);
  const [keyword, setKeyword] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const [c, k] = await Promise.all([getKeywordClaim(), getKeywordToReveal()]);
      if (!live) return;
      setClaim(c);
      if (k !== null) setKeyword(k);
    };
    void refresh();
    const timer = setInterval(refresh, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  async function acknowledgeKeyword() {
    await ackKeywordReveal();
    setKeyword(null);
  }

  return (
    <>
      {keyword && (
        <div className="fixed right-3 top-3 z-[90] w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-yellow-500/40 bg-card p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-yellow-500" aria-hidden />
            <h2 className="text-sm font-semibold text-card-foreground">
              Compte créé — notez votre mot clé
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ce mot clé reconnecte vos autres caisses au compte, même si vous perdez ce téléphone. Il
            n'est affiché qu'une seule fois.
          </p>
          <p className="mt-3 select-all rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-center font-mono text-lg font-semibold tracking-widest text-yellow-600 dark:text-yellow-400">
            {formatKeyword(keyword)}
          </p>
          <Button onClick={acknowledgeKeyword} className="mt-4 w-full" size="sm">
            J'ai noté ce mot clé
          </Button>
        </div>
      )}
      {!keyword && claim && (
        <div className="fixed inset-x-0 top-0 z-[85] bg-yellow-500/10 px-4 py-2 text-center text-xs text-yellow-700 backdrop-blur dark:text-yellow-400">
          <ShieldAlert className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Compte en cours de vérification — confirmation sous 48 h dès le retour du réseau. La
          caisse fonctionne en mode provisoire.{" "}
          <span className="font-semibold">({claim.storeName})</span>
        </div>
      )}
    </>
  );
}
