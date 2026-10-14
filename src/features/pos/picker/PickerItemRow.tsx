import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { PickerItem } from "./useItemsToAdd";

export function PickerItemRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: PickerItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>
            {item.quantity} × {formatFCFA(item.price)}
          </span>
          <span className="font-medium text-primary">{formatFCFA(item.price * item.quantity)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDecrease}>
          <X className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onIncrease}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
