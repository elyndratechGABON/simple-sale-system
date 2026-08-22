// Extraction de la couleur dominante d'un logo pour teinter l'interface.
//
// L'app ne stocke qu'une TEINTE (cf. `applyTheme` dans settings.ts) : on ramène donc le
// logo à une seule valeur de teinte OKLCH, en ignorant les pixels transparents et les
// quasi-neutres (gris, noir, blanc) qui n'ont rien à dire sur la couleur de marque.
// La moyenne est pondérée par le chroma : un pixel franc pèse plus qu'un reflet pâle.
// Renvoie `null` si aucune couleur exploitable — logo monochrome, on ne touche à rien.

/** RVB (0-255) → composantes OKLCH. Dérivé de la spécification Björn Ottosson. */
function rgbToOklch(r: number, g: number, b: number): { h: number; c: number; l: number } {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];

  // sRGB → OKLab
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.hypot(a, b2);
  let h = (Math.atan2(b2, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    c,
    h,
  };
}

/** Seuils : en dessous, un pixel est jugé « neutre » et exclu du vote. */
const MIN_CHROMA = 0.03;
const MIN_LIGHTNESS = 0.15;
const MAX_LIGHTNESS = 0.95;

/**
 * Teinte dominante (0-360) d'une image déjà chargée, ou `null`.
 * L'image est réduite à 32 px côté lecture : au-delà, la moyenne ne change plus.
 */
export function extractLogoHue(img: HTMLImageElement): number | null {
  const SIZE = 32;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  let sumSin = 0;
  let sumCos = 0;
  let weight = 0;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  } catch {
    // Canvas pollué (image cross-origin sans CORS) — impossible ici, mais ne pas planter.
    return null;
  }

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue;
    const { h, c, l } = rgbToOklch(data[i], data[i + 1], data[i + 2]);
    if (c < MIN_CHROMA || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;
    const rad = (h * Math.PI) / 180;
    const w = c;
    sumSin += Math.sin(rad) * w;
    sumCos += Math.cos(rad) * w;
    weight += w;
  }

  if (weight === 0) return null;
  const hue = (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
  return hue < 0 ? hue + 360 : hue;
}
