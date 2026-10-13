import { useState } from "react";
import { cn } from "@/lib/utils";
import { Utensils } from "lucide-react";
import { FreeLineDialog } from "@/components/pos";
import { PinDialog } from "@/components/PinDialog";
import { CloseDayDialog } from "@/components/CloseDayDialog";
import { FloorPlan } from "./FloorPlan";
import { CategoriesColumn } from "./CategoriesColumn";
import { ProductPanel } from "./ProductPanel";
import { CartPanel } from "./CartPanel";
import { MobileCartBar } from "./MobileCartBar";
import { VariantPickerDialog } from "./VariantPickerDialog";
import { ManualQtyDialog } from "./ManualQtyDialog";
import { OrdersDrawer } from "./OrdersDrawer";
import { CheckoutDialog } from "./CheckoutDialog";
import { SaleFlash } from "./SaleFlash";
import { usePos } from "./usePos";
import { TableActions } from "./TableActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePreferences } from "@/hooks/use-preferences";

/**
 * La page ouvre directement sur la grille et le panier. Un écran d'attente précédait chaque
 * vente (« Nouvelle commande ») : un geste de plus sur l'action la plus répétée de la
 * journée, pour un écran qui n'apprenait rien. L'état vide de la grille suffit.
 */
export function PosPage() {
  const pos = usePos();
  const { mode, setMode } = pos;
  const { features } = usePreferences();
  const showTables = features?.tables ?? false;

  return (
    <div
      className={cn(
        "app-container space-y-4 py-4",
        pos.compact && (pos.activeTable !== null || pos.lines.length > 0) && "pb-20",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold">
            <Utensils className="h-6 w-6 shrink-0 text-primary" /> Caisse
          </h1>
        </div>
        {showTables && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("comptoir")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                mode === "comptoir"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              Comptoir
            </button>
            <button
              type="button"
              onClick={() => setMode("tables")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                mode === "tables"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              Tables
            </button>
          </div>
        )}
      </header>

      {mode === "tables" ? (
        // Mode Tables : 3 colonnes (FloorPlan | ProductPanel | CartPanel)
        <div className="grid gap-4 lg:grid-cols-[minmax(250px,20%)_minmax(0,1fr)_minmax(320px,28%)] xl:grid-cols-[minmax(250px,18%)_minmax(0,1fr)_minmax(340px,26%)] 2xl:grid-cols-[minmax(280px,16%)_minmax(0,1fr)_minmax(360px,24%)]">
          <FloorPlan pos={pos} />
          <ProductPanel pos={pos} />
          <CartPanel pos={pos} />
        </div>
      ) : (
        // Mode Comptoir : layout 3 colonnes (Categories | Products | Cart)
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(320px,28%)] 2xl:grid-cols-[minmax(210px,18%)_minmax(0,1fr)_minmax(360px,26%)]">
            <CategoriesColumn pos={pos} />
            <ProductPanel pos={pos} />
            <CartPanel pos={pos} />
          </div>
        </>
      )}

      <MobileCartBar pos={pos} />

      <FreeLineDialog open={pos.freeOpen} onOpenChange={pos.setFreeOpen} onAdd={pos.addFreeLine} />
      <VariantPickerDialog pos={pos} />
      <CloseDayDialog
        open={pos.closeOpen}
        onOpenChange={pos.setCloseOpen}
        salesCount={pos.salesToday.length}
        total={pos.todayTotal}
        busy={pos.closeDayMut.isPending}
        onConfirm={() => pos.closeDayMut.mutate()}
      />
      <OrdersDrawer pos={pos} />
      <PinDialog
        open={pos.cancelPinOpen}
        onOpenChange={pos.setCancelPinOpen}
        description={`Toute l'addition de la table ${pos.activeTable?.table ?? ""} est supprimée et le stock des articles servis est restauré.`}
        onConfirm={() => {
          if (pos.activeTable) pos.cancelTableMut.mutate(pos.activeTable.id);
        }}
      />
      <CheckoutDialog pos={pos} />
      <ManualQtyDialog pos={pos} />
      <SaleFlash saleFlash={pos.saleFlash} />
    </div>
  );
}
