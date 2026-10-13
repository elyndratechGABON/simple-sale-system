import { Move, ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ZoomControlsProps {
  zoom: number;
  maxZoom: number;
  onZoomChange: (value: number) => void;
}

export function ZoomControls({ zoom, maxZoom, onZoomChange }: ZoomControlsProps) {
  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Slider
          min={1}
          max={maxZoom}
          step={0.05}
          value={[zoom]}
          onValueChange={([v]) => onZoomChange(v)}
          aria-label="Zoom de recadrage"
        />
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)} %
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Move className="h-3.5 w-3.5" /> Touchez l'image pour la repositionner.
      </p>
    </>
  );
}
