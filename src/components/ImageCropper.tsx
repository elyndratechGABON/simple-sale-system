// Recadrage CARRé, sans dépendance externe.
//
// Les deux photos de l'application (logo de la boutique, photo de profil du
// propriétaire) s'affichent dans des cases carrées. Plutôt qu'un recadrage
// automatique aveugle (le centre d'un logo horizontal n'est pas forcément ce
// qu'on veut montrer), on laisse l'utilisateur choisir : image déplaçable au
// doigt dans un cadre carré, zoom au curseur, export webp à la taille demandée.
//
// Géométrie en coordonnées NATURELLES de l'image pour ne jamais dépendre de la
// taille d'affichage : la case affiche un pavé source [ox, ox+boxN[ × [oy, oy+boxN[,
// et `s` (cover × zoom) convertit naturel → écran. Le drag ne touche qu'à ox/oy.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Move, ZoomIn, Check, X as XIcon } from "lucide-react";

/** Zoom maxi (× le recadrage de couverture) : suffisant pour resserrer sur un
 *  détail, sans naviguer dans une image de 4000 px à l'aveugle. */
const MAX_ZOOM = 3;

export interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL (object URL ou dataURL) de l'image choisie. */
  source: string;
  /** Taille du carré exporté, par défaut 256 px. */
  outputSize?: number;
  title?: string;
  /** Appelée avec le dataURL webp du carré choisi, à la validation. */
  onCrop: (dataUrl: string) => void;
}

export function ImageCropper({
  open,
  onOpenChange,
  source,
  outputSize = 256,
  title = "Recadrer l'image",
  onCrop,
}: ImageCropperProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxPx, setBoxPx] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    id: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);

  // La hauteur du cadre détermine `s` ; la re-mesurer au resize garde la géométrie exacte.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxPx(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // (Re)chargement à chaque ouverture/image — on repart centré, zoom 1.
  useEffect(() => {
    if (!open || !source) return;
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.src = source;
    // L'image n'est prête qu'une fois le cadre mesuré ; on attend les deux.
    const ready = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    if (img.decode) void img.decode().then(ready).catch(ready);
    else img.onload = ready;
  }, [open, source]);

  const box = boxPx > 0 ? boxPx : 240;
  const cover = natural ? Math.max(box / natural.w, box / natural.h) : 1;
  const scale = cover * zoom;
  const boxN = natural ? box / scale : box; // côté du pavé source, en px naturels
  const imgW = natural ? natural.w * scale : box;
  const imgH = natural ? natural.h * scale : box;

  // Contraint l'origine du pavé à rester DANS l'image.
  const clampOffset = useCallback(
    (x: number, y: number) => {
      if (!natural) return { x: 0, y: 0 };
      const maxX = Math.max(0, natural.w - box / scale);
      const maxY = Math.max(0, natural.h - box / scale);
      return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
    },
    [natural, box, scale],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    e.preventDefault();
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    setOffset(clampOffset(d.ox - dx, d.oy - dy));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  // Garde le point SOUS le centre du cadre quand on zoome.
  const handleZoom = (next: number) => {
    if (!natural) return;
    const focalX = offset.x + boxN / 2;
    const focalY = offset.y + boxN / 2;
    setZoom(next);
    const nextN = box / (cover * next);
    setOffset(clampOffset(focalX - nextN / 2, focalY - nextN / 2));
  };

  const handleCrop = () => {
    if (!natural || boxN <= 0) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, offset.x, offset.y, boxN, boxN, 0, 0, outputSize, outputSize);
      onCrop(canvas.toDataURL("image/webp", 0.9));
    };
    img.src = source;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Déplacez l'image et ajustez le zoom — seule la zone carrée est conservée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative mx-auto aspect-square w-full max-w-[300px] touch-none select-none overflow-hidden rounded-xl border bg-muted/40"
          >
            {natural ? (
              <img
                src={source}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{
                  left: -offset.x * scale,
                  top: -offset.y * scale,
                  width: imgW,
                  height: imgH,
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Chargement…
              </div>
            )}
            {/* Coins sombres hors-cadre : le carré apparaît comme une fenêtre sur l'image. */}
            <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)]" />
          </div>

          <div className="flex items-center gap-3 px-1">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => handleZoom(v)}
              aria-label="Zoom de recadrage"
            />
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)} %
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Move className="h-3.5 w-3.5" /> Touchez l'image pour la repositionner.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <XIcon className="h-4 w-4 mr-1.5" /> Annuler
          </Button>
          <Button onClick={handleCrop} disabled={!natural}>
            <Check className="h-4 w-4 mr-1.5" /> Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
