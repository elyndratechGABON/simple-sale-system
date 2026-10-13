import type { Product } from "@/lib/db";
import { Dialog } from "@/components/ui/dialog";
import { ProductForm } from "@/components/ProductForm";
import type { StocksDialogsApi } from "./useStocksDialogs";
import { AddStockDialog } from "./AddStockDialog";
import { ProductDetailDialog } from "./ProductDetailDialog";
import { RemoveStockDialog } from "./RemoveStockDialog";
import { DeleteProductDialog } from "./DeleteProductDialog";
import { MovementsDialog } from "./Movements";

/** Tous les dialogues de la page Stocks, montés côte à côte. */
export function StocksDialogs({
  dialogs,
  products,
  isService,
  lastSoldAtByProduct,
}: {
  dialogs: StocksDialogsApi;
  products: Product[];
  isService: boolean;
  lastSoldAtByProduct: Map<string, number>;
}) {
  const {
    editing,
    editOpen,
    setEditOpen,
    prestationOpen,
    setPrestationOpen,
    detailId,
    setDetailId,
    stockOpen,
    setStockOpen,
    stockSeed,
    removeTarget,
    setRemoveTarget,
    deleteTarget,
    setDeleteTarget,
    movementsOpen,
    setMovementsOpen,
    movementsProductId,
    setMovementsProductId,
    openAddStock,
    openEdit,
    closeEdit,
    closePrestation,
  } = dialogs;

  const detailProduct = products.find((p) => p.id === detailId) ?? null;
  const detailLastSoldAt = detailProduct ? lastSoldAtByProduct.get(detailProduct.id) : undefined;

  return (
    <>
      <AddStockDialog
        open={stockOpen}
        onOpenChange={setStockOpen}
        seedProductId={stockSeed}
        products={products}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <ProductForm editing={editing} onClose={closeEdit} />
      </Dialog>

      {isService && (
        <Dialog open={prestationOpen} onOpenChange={setPrestationOpen}>
          <ProductForm
            editing={editing}
            onClose={closePrestation}
            defaultCategory="Service"
            defaultType="service"
          />
        </Dialog>
      )}

      <ProductDetailDialog
        product={detailProduct}
        lastSoldAt={detailLastSoldAt}
        onClose={() => setDetailId(null)}
        onAddStock={openAddStock}
        onEdit={(p) => {
          setDetailId(null);
          openEdit(p);
        }}
      />

      <RemoveStockDialog product={removeTarget} onClose={() => setRemoveTarget(null)} />

      <MovementsDialog
        open={movementsOpen}
        onOpenChange={(v) => {
          setMovementsOpen(v);
          // Refermé : on oublie le filtre produit pour que la prochaine ouverture
          // depuis le bandeau « Journal » reparte sur l'historique complet.
          if (!v) setMovementsProductId(null);
        }}
        productId={movementsProductId}
      />

      <DeleteProductDialog product={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </>
  );
}
