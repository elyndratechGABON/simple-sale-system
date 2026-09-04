import { Button } from "@/components/ui/button";

export function CartPanel() {
  // Panier : lignes (PosLine), sous-total, actions (vider, payer)
  // Migration depuis pos.tsx : CartShell + PosLine + boutons d'action
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto p-4 text-center text-muted-foreground">
        [CartPanel — à migrer depuis pos.tsx]
      </div>
      <div className="border-t p-4">
        <Button className="w-full" variant="default">
          Payer
        </Button>
      </div>
    </div>
  );
}
