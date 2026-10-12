// Coquille du panier : une carte fixe sur grand écran, un tiroir sur mobile.
// Une seule interface, deux contenus — pas deux implémentations.

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

export function CartShell({
  compact,
  open,
  onOpenChange,
  children,
}: {
  compact: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
}) {
  if (!compact) {
    return (
      <Card className="lg:sticky lg:top-20 h-fit">
        <CardContent className="space-y-4 p-4">{children}</CardContent>
      </Card>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="sr-only">Panier et encaissement</DrawerTitle>
        {/* `max-h` et non `h` : une addition d'une seule tournée ne doit pas ouvrir une
            feuille pleine hauteur. Le défilement est interne, la poignée reste visible.
            La marge système basse est déjà posée par DrawerContent (pb safe-area) —
            on n'ajoute ici que le confort d'un `1rem`. */}
        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
