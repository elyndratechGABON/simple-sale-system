import { cn } from "@/lib/utils";
import { FreeLineDialog } from "@/components/pos";
import { PinDialog } from "@/components/PinDialog";
import { CloseDayDialog } from "@/components/CloseDayDialog";
import { FloorPlan } from "./FloorPlan";
import { ContextBadge } from "./ContextBadge";
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

/**
 * La page ouvre directement sur la grille et le panier. Un écran d'attente précédait chaque
 * vente (« Nouvelle commande ») : un geste de plus sur l'action la plus répétée de la
 * journée, pour un écran qui n'apprenait rien. L'état vide de la grille suffit.
 */
export function PosPage() {
  const pos = usePos();
  return (
    // `pb-20` dès qu'il y a quelque chose à encaisser : la barre de résumé est en `fixed`
    // et ne pousse rien, elle recouvrirait sinon le dernier produit de la grille.
    <div
      className={cn(
        "app-container space-y-4 py-4",
        pos.compact && (pos.activeTable !== null || pos.lines.length > 0) && "pb-20",
      )}
    >
      <ContextBadge
        target={pos.target}
        total={pos.activeTable?.total ?? pos.total}
        onBackToCounter={() => pos.selectTarget({ kind: "direct" })}
      />
      <FloorPlan pos={pos} />

      {/* Largeurs par palier (§21, §22) :
          - ≥1024 : produits ~70 %, panier 30 % (360 px).
          - ≥1280 : 3 colonnes Catégories | Produits | Panier (20 / 52 / 28).
          - ≥1536 : la grille de produits gagne de la place, le panier ne grossit pas. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(320px,28%)] 2xl:grid-cols-[minmax(210px,18%)_minmax(0,1fr)_minmax(360px,26%)]">
        <CategoriesColumn pos={pos} />
        <ProductPanel pos={pos} />
        <CartPanel pos={pos} />
      </div>

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
