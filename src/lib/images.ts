/**
 * Réduction d'image côté navigateur : lit un `File`, le dessine sur un canvas borné à
 * `max` px (plus grand côté) et rend un Blob image. Une photo de plusieurs mégaoctets
 * ne doit ni gonfler IndexedDB, ni ralentir les écrans qui l'affichent.
 *
 * Renvoie aussi l'élément Image décodé — certains appelants en tirent une palette ou
 * des dimensions. Jette si le fichier n'est pas une image lisible.
 *
 * Le Blob est transitoire (compression mémoire), la valeur persistée en DB reste une
 * dataURL string : les ops du relais sérialisent en JSON, un Blob ne peut pas voyager.
 * Charte : max 500 px, **WebP** q0.7 (fallback JPEG si le navigateur ne sait pas
 * encoder WebP) — le WebP pèse ~30 % de moins que le JPEG à qualité égale, ce qui
 * allège la synchronisation P2P TOUS côtés (payload = dataURL embarquée dans l'op).
 */
import type { Product } from "./db/types/sync";
import { touch } from "./db/internal";

/** Charte photo : edge max et qualité communs au formulaire ET à la migration. */
export const MAX_PHOTO_EDGE = 500;
export const PHOTO_QUALITY = 0.7;

/** Le navigateur sait-il ENCODER du WebP sur canvas ? (les bans récents: oui ;
 *  Safari < 14 parque : non — le JPEG reste le filet de sécurité.) Cachetable :
 *  la réponse ne peut pas changer pendant une session. */
let webpEncodeCache: boolean | undefined;
export function canvasWebpSupport(): boolean {
  if (webpEncodeCache === undefined) {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    webpEncodeCache = probe.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpEncodeCache;
}

/** Le mime de la CHARTE ACTUELLE pour cet appareil (WebP prioritaire, JPEG en filet). */
export function charteMime(): string {
  return canvasWebpSupport() ? "image/webp" : "image/jpeg";
}

/** Le dataURL respecte-t-il la charte du pipeline (webp OU jpeg webp fallback) ? */
export function dataUrlOfCharte(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/webp") || dataUrl.startsWith("data:image/jpeg");
}

export async function fileToScaledBlob(
  file: File,
  max = MAX_PHOTO_EDGE,
  quality = PHOTO_QUALITY,
): Promise<{ blob: Blob; img: HTMLImageElement }> {
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
    return {
      blob: await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b) return reject(new Error("Canvas to Blob failed"));
            resolve(b);
          },
          charteMime(),
          quality,
        );
      }),
      img,
    };
  } catch {
    throw new Error("Image illisible");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Blob → dataURL persistant. Les objets URL temporaires (`createObjectURL`) meurent au
 * rechargement : une photo enregistrée en blob:... était une image qui disparaissait à
 * chaque réouverture de la caisse, et les variantes retombaient sur l'image du parent.
 * Le dataURL, lui, survit en IndexedDB... et voyage chez les pairs.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Image illisible"));
    fr.readAsDataURL(blob);
  });
}

/**
 * Ré-encode un dataURL existant (Base64 legacy) selon la charte : max 500 px,
 * WebP q0.7 (fallback JPEG). Les dataURL du mauvais format (l'ancienne charte
 * 256 px q0.85, un raw JPEG d'avant la charte) et les données trop larges sont
 * réduites ; un dataURL déjà conforme repasse tel quel — la migration n'a donc
 * un coût qu'une fois par photo.
 */
export async function reencodeDataUrl(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(charteMime(), PHOTO_QUALITY);
}

/**
 * Migration des photos legacy (Étape 2.3) : tout dataURL PAS DÉJÀ dans la charte
 * (webp OU jpeg-léger selon l'appareil) est re-encodé 500 px / 0.7 — produit et
 * variantes. Une photo illisible est laissée en place, jamais supprimée.
 * Fire-and-forget : le crash mémoire vient du volume, pas de l'ordre d'exécution.
 */
export async function migrateLegacyPhotos(): Promise<number> {
  let migrated = 0;
  const { getDB } = await import("./db/internal");
  const db = getDB();
  const products = await db.products.toArray();
  for (const p of products) {
    let changed = false;
    const next: Product = { ...p };
    if (typeof p.photo === "string" && !dataUrlOfCharte(p.photo)) {
      try {
        next.photo = await reencodeDataUrl(p.photo);
        changed = true;
      } catch {
        /* photo illisible : on la garde */
      }
    }
    if (p.variants?.some((v) => typeof v.photo === "string" && !dataUrlOfCharte(v.photo))) {
      next.variants = await Promise.all(
        p.variants.map(async (v) => {
          if (typeof v.photo !== "string" || dataUrlOfCharte(v.photo)) return v;
          try {
            const photo = await reencodeDataUrl(v.photo);
            changed = true;
            return { ...v, photo };
          } catch {
            return v;
          }
        }),
      );
    }
    if (changed) {
      await db.products.put({ ...next, ...touch() });
      migrated++;
    }
  }
  return migrated;
}
