/**
 * Réduction d'image côté navigateur : lit un `File`, le dessine sur un canvas borné à
 * `max` px (plus grand côté) et rend un dataURL webp. Une photo de plusieurs mégaoctets
 * ne doit ni gonfler IndexedDB, ni ralentir les écrans qui l'affichent.
 *
 * Renvoie aussi l'élément Image décodé — certains appelants en tirent une palette ou
 * des dimensions. Jette si le fichier n'est pas une image lisible.
 */
export async function fileToScaledDataUrl(
  file: File,
  max = 256,
): Promise<{ dataUrl: string; img: HTMLImageElement }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/webp", 0.85), img };
  } finally {
    URL.revokeObjectURL(url);
  }
}
