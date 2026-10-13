import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { formatFCFA, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PosController } from "./usePos";

/** Panneau « Commandes en cours » : la liste des tables occupées, la plus ancienne d'abord. */
export function OrdersDrawer({ pos }: { pos: PosController }) {
  return (
    <Drawer open={pos.ordersOpen} onOpenChange={pos.setOrdersOpen}>
      <DrawerContent>
        <DrawerTitle className="px-4 pt-2">Commandes en cours</DrawerTitle>
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
          {pos.openTables.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune commande en cours.
            </p>
          ) : (
            <div className="space-y-2 pt-2">
              {pos.openTables
                .slice()
                .sort((a, b) => (a.opened_at ?? 0) - (b.opened_at ?? 0))
                .map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3",
                      "border-primary/30 bg-accent/50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Table {t.table}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-primary/10 text-primary">
                          occupée
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatFCFA(t.total)} · {t.opened_at ? formatTime(t.opened_at) : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          pos.setOrdersOpen(false);
                          pos.selectTarget({ kind: "table", saleId: t.id });
                        }}
                      >
                        Ouvrir
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
