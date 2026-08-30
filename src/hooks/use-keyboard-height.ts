// Détection de l'ouverture du clavier virtuel du téléphone.
//
// Le layout viewport ne rétrécit PAS quand le clavier s'ouvre — ni sur iOS ni sur
// Android Chrome (mode `resizes-visual` par défaut) — donc `dvh`/`vh` ne bougent pas
// et les éléments fixés en bas restent derrière les touches. Le seul API fiable est
// `window.visualViewport` : sa hauteur diminue et son `offsetTop` / l'écart avec
// `window.innerHeight` valent la hauteur du clavier.
//
// Le hook expose `{ isKeyboardOpen, keyboardHeight }` et, en effet de bord, écrit
// `--kb-h` (px) sur `<html>` pour que n'importe quelle règle CSS (« dialogs à plafond
// clavier compris », barres fixes…) s'ajuste sans passer par React.
//
// Seuil d'activation (100 px) : évite les faux positifs du zoom, du split-screen et
// du repli de la barre d'adresse, qui rétrécissent aussi le visualViewport.
import { useEffect, useState } from "react";

const KEYBOARD_THRESHOLD_PX = 100;

export interface KeyboardHeight {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

/** Hauteur estimée du clavier en px, 0 s'il est fermé. */
function measureKeyboard(vv: VisualViewport): number {
  const layout = window.innerHeight;
  const visual = vv.height;
  // iOS : la barre haute et la zone couverte par le clavier valent `offsetTop`.
  // Android : le rétrécissement du visualViewport vs le layout vaut le clavier.
  const height = Math.max(layout - visual, vv.offsetTop);
  return height > KEYBOARD_THRESHOLD_PX ? height : 0;
}

export function useKeyboardHeight(): KeyboardHeight {
  const [{ isKeyboardOpen, keyboardHeight }, setState] = useState<KeyboardHeight>({
    isKeyboardOpen: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const h = measureKeyboard(vv);
      document.documentElement.style.setProperty("--kb-h", `${h}px`);
      setState({ isKeyboardOpen: h > 0, keyboardHeight: h });
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();

    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.setProperty("--kb-h", "0px");
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
}
