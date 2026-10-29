import { useState } from "react";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, Utensils } from "lucide-react";
import { FreeLineDialog } from "@/components/pos";
import { PinDialog } from "@/components/PinDialog";
import { CloseDayDialog } from "@/components/CloseDayDialog";
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
import { TablesView } from "./TablesView";
import { usePreferences } from "@/hooks/use-preferences";
import { useAccess } from "@/hooks/use-access";

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
  const { isOwner } = useAccess();
  // Colonne Catégories (desktop) repliable : plus d'espace à la grille quand le
  // vendeur n'en a plus besoin. Défaut : ouverte.
  const [showCategories, setShowCategories] = useState(true);

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
        {features?.tables && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pos.setMode("comptoir")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pos.mode === "comptoir"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              Comptoir
            </button>
            <button
              type="button"
              onClick={() => pos.setMode("tables")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pos.mode === "tables"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              Tables
            </button>
          </div>
        )}
        {/* Repli de la colonne Catégories (desktop uniquement : sous xl elle n'existe pas). */}
        <button
          type="button"
          onClick={() => setShowCategories((v) => !v)}
          aria-pressed={!showCategories}
          aria-label={
            showCategories
              ? "Masquer la colonne des catégories"
              : "Afficher la colonne des catégories"
          }
          title={showCategories ? "Masquer les catégories (desktop)" : "Afficher les catégories"}
          className="hidden xl:flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        >
          {showCategories ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </header>

      {pos.mode === "tables" ? (
        <TablesView pos={pos} />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:transition-[grid-template-columns] xl:duration-300",
              // Desktop : avec/sans colonne catégories. La transition anime le
              // rétrécissement de la colonne (bas-'xl' templates), faute de quoi
              // un lever se produit instantanément.
              showCategories
                ? "xl:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(320px,28%)] 2xl:grid-cols-[minmax(210px,18%)_minmax(0,1fr)_minmax(360px,26%)]"
                : "xl:grid-cols-[minmax(0,1fr)_minmax(320px,28%)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,26%)]",
            )}
          >
            {showCategories && <CategoriesColumn pos={pos} />}
            <ProductPanel pos={pos} />
            <CartPanel pos={pos} />
          </div>
        </>
      )}

      <MobileCartBar pos={pos} />

      <FreeLineDialog open={pos.freeOpen} onOpenChange={pos.setFreeOpen} onAdd={pos.addFreeLine} />
      <VariantPickerDialog pos={pos} />
      {isOwner && (
        <CloseDayDialog
          open={pos.closeOpen}
          onOpenChange={pos.setCloseOpen}
          salesCount={pos.salesToday.length}
          total={pos.todayTotal}
          busy={pos.closeDayMut.isPending}
          onConfirm={() => pos.closeDayMut.mutate()}
        />
      )}
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
