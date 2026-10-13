import type { PointerEvent, RefObject } from "react";

interface CropStageProps {
  boxRef: RefObject<HTMLDivElement | null>;
  source: string;
  natural: { w: number; h: number } | null;
  offset: { x: number; y: number };
  scale: number;
  imgW: number;
  imgH: number;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
}

export function CropStage({
  boxRef,
  source,
  natural,
  offset,
  scale,
  imgW,
  imgH,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: CropStageProps) {
  return (
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
  );
}
