import { useState } from "react";
import { Plus } from "lucide-react";
import { getSaleItems, type Sale } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TablesGrid } from "./TablesGrid";
import { InProgressBills } from "./InProgressBills";
import { TableMenuDialog } from "./TableMenuDialog";
import { ProductPickerDialog } from "./ProductPickerDialog";
import type { PickerItem } from "./picker/useItemsToAdd";
import type { PosController } from "./usePos";

interface TablesViewProps {
  pos: PosController;
}

type Menu = { label: string; sale: Sale | null };
type Picker = Menu & { items: PickerItem[] };

export function TablesView({ pos }: TablesViewProps) {
  const [tableMenu, setTableMenu] = useState<Menu | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);

  /** L'addition déjà servie est lue AVANT d'ouvrir le sélecteur : le dialogue prend ses
   *  articles en UNE seule fois à l'ouverture, les charger après ne les ferait jamais
   *  apparaître (son état local est figé au montage). */
  async function openPicker(label: string, sale: Sale | null) {
    const rows = sale ? await getSaleItems(sale.id) : [];
    setPicker({
      label,
      sale,
      items: rows.map((i) => ({
        id: i.id,
        productId: i.product_id,
        name: i.name,
        quantity: i.quantity,
        price: i.price_at_sale,
        cost: i.cost_at_sale,
      })),
    });
  }

  /** Encaisser une addition : on vise la table, on ouvre le panneau de paiement et on
   *  revient au comptoir — c'est là que le paiement se fait, pas dans le plan de salle. */
  function checkout(sale: Sale) {
    pos.setTarget({ kind: "table", saleId: sale.id });
    pos.setCashing({ kind: "table" });
    pos.setMode("comptoir");
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* « + Nouvelle table » : un libellé de PLUS dans le plan de salle (préférences) —
          le geste du patron qui ajoute un poste, directement sur l'écran Tables (§2). */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => pos.addTable()}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Nouvelle table
        </Button>
      </div>
      <TablesGrid
        pos={pos}
        onTableTap={(label, sale) => setTableMenu({ label, sale })}
        onEncaisser={checkout}
      />

      <InProgressBills pos={pos} onCheckout={checkout} />

      <TableMenuDialog
        open={!!tableMenu}
        onOpenChange={(open) => !open && setTableMenu(null)}
        tableLabel={tableMenu?.label ?? ""}
        sale={tableMenu?.sale ?? null}
        onCreateBill={() => tableMenu && openPicker(tableMenu.label, null)}
        onAddProducts={() => tableMenu && openPicker(tableMenu.label, tableMenu.sale)}
        onCheckout={() => tableMenu?.sale && checkout(tableMenu.sale)}
      />

      {picker && (
        <ProductPickerDialog
          open
          onOpenChange={(open) => !open && setPicker(null)}
          sale={picker.sale}
          tableLabel={picker.label}
          initialItems={picker.items}
          pos={pos}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
