import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Vrai en dessous du point de rupture.
 *
 * `breakpoint` est paramétrable parce qu'un appelant qui change de STRUCTURE — et pas
 * seulement de style — doit basculer exactement là où sa mise en page bascule. La caisse
 * passe en colonne unique à `lg` (1024) : si elle interrogeait le défaut à 768, une
 * tablette de 800 px se retrouverait avec le panneau latéral prévu pour le bureau, mais
 * empilé sous la grille d'articles.
 *
 * Renvoie `false` au premier rendu (serveur et hydratation) : `window` n'existe pas au
 * rendu serveur, et le lire pendant le rendu casserait l'hydratation.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isMobile;
}
