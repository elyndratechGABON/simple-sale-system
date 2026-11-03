// CLAVIER VIRTUEL (mission VisualViewport) : sur mobile, un `fixed` est posé sur le
// LAYOUT viewport — quand le clavier monte, la fenêtre visuelle rétrécit et le bas
// (dock de navigation, footer « Valider » des modales) disparaît DERRIÈRE les touches.
// La seule mesure fiable est le delta entre la fenêtre entière et la partie visible
// du `visualViewport`, AU MOMENT où le clavier est levé.
//
// CONTRAT : renvoie `{ keyboardHeight }` ET écrit la variable CSS `--kb-h` à la
// racine — les règles de `styles.css` (dock, padding de l'app-main, barre de résumé)
// en dérivent, elles restent inertes tant que la valeur vaut 0 (clavier fermé).
import { useEffect, useState } from "react";

export interface KeyboardHeightState {
  /** Hauteur du clavier virtuel en px. 0 si fermé (ou sur desktop). */
  keyboardHeight: number;
}

export function useKeyboardHeight(): KeyboardHeightState {
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // vieux navigateur : aucune mesure possible

    const update = () => {
      // Ne compte comme clavier que la partie EN BAS (delta positif) : un zoom
      // pincement fait varier offsetTop sans toucher au clavier.
      const delta = window.innerHeight - vv.height - Math.max(0, vv.offsetTop);
      const h = Math.max(0, Math.round(delta));
      setKb(h);
      document.documentElement.style.setProperty("--kb-h", `${h}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--kb-h");
    };
  }, []);

  return { keyboardHeight: kb };
}
