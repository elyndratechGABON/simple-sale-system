import { useState } from "react";
import { PinSetupDialog } from "@/components/settings/PinSetupDialog";
import { isPinSet, DEFAULT_CANCEL_PIN } from "@/lib/pin";
import { Button } from "@/components/ui/button";
import { CodeCard } from "./CodeCard";

/**
 * Le PIN d'ANNULATION, en carte premium comme le code de récupération (mission onglet
 * Système). Deux états :
 *  - aucun code posé → le défaut `0010` est affiché, révélable et copiable ;
 *  - code personnalisé → il est HACHÉ (PBKDF2), donc NON consultable : l'œil reste
 *    muet sur cette ligne et la carte n'offre que « Changer » (saisie d'un code neuf).
 */
export function CancelPinCard() {
  const [open, setOpen] = useState(false);
  // `isPinSet()` lit `localStorage` : non réactif — `key` force le remontage du
  // dialogue à chaque ouverture, pour qu'il relise l'état au bon moment.
  const [key, setKey] = useState(0);
  const pose = isPinSet();

  return (
    <>
      <CodeCard
        title="Code PIN d'annulation"
        description={
          pose ? (
            "Code personnalisé — il protège chaque annulation de vente ou de table. Consultable : c'est votre code."
          ) : (
            <>
              Demandé avant d&apos;annuler une vente ou libérer une table (stock restauré). Défaut
              de la boutique&nbsp;: <b>{DEFAULT_CANCEL_PIN}</b> — personnalisez-le.
            </>
          )
        }
        warning="Personne ne peut le récupérer à votre place : notez-le précieusement."
        code={pose ? null : DEFAULT_CANCEL_PIN}
        unavailableMessage="Le code personnalisé est haché sur cet appareil — il ne peut pas être relit ici."
        copyable={!pose}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setKey((n) => n + 1);
              setOpen(true);
            }}
          >
            {pose ? "Changer" : "Créer un code"}
          </Button>
        }
      />
      <PinSetupDialog key={key} open={open} onOpenChange={setOpen} />
    </>
  );
}
