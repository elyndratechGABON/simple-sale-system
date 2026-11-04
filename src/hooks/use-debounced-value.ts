import { useEffect, useState } from "react";

/**
 * Retarde la DIFFUSION d'une valeur : l'input contrôlé continue d'afficher la frappe
 * instantanée, mais les dérivés coûteux branchés sur la valeur débouncee (filtres,
 * grilles de centaines de cartes) ne recalculent qu'après un silence de `delay` ms.
 *
 * Règle d'usage : l'état source garde sa valeur brute (l'input ne doit jamais laguer) ;
 * seul le useMemo qu'on veut alléger passe par cette valeur retardée.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
