import { useQuery } from "@tanstack/react-query";
import { DEFAULT_PREFERENCES, getPreferences, type Preferences } from "@/lib/settings";

/**
 * Préférences utilisateur, relues à la demande.
 *
 * Passer par React Query plutôt que par un contexte React n'est pas gratuit : c'est ce
 * qui permet à /settings de rafraîchir l'en-tête d'un simple
 * `invalidateQueries({ queryKey: ["preferences"] })`, sans câbler de state global.
 *
 * La lecture se fait dans `queryFn`, donc après montage : `getPreferences()` touche
 * localStorage, indisponible au rendu serveur. Le premier rendu utilise les défauts.
 */
export function usePreferences(): Preferences {
  const { data } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => getPreferences(),
    staleTime: Infinity,
  });
  return data ?? DEFAULT_PREFERENCES;
}
