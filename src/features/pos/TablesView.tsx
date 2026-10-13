import { useState } from "react";
import { TablesGrid } from "./TablesGrid";
import { InProgressBills } from "./InProgressBills";
import { TableMenuDialog } from "./TableMenuDialog";
// import { ProductPickerDialog } from "./ProductPickerDialog"; // TODO: FICHIER 4
import type { PosController } from "./usePos";
import type { Sale } from "@/lib/db";

interface TablesViewProps {
  pos: PosController;
}

export function TablesView({ pos }: TablesViewProps) {
  const [tableMenu, setTableMenu] = useState<{ label: string; sale: Sale | null } | null>(null);
  const [picker, setPicker] = useState<{ sale: Sale | null } | null>(null);

  return (
    <div className="h-full flex flex-col">
      <TablesGrid
        pos={pos}
        onTableTap={(label, sale) => {
          if (sale) {
            setTableMenu({ label: sale.table ?? "", sale });
          } else {
            setPicker({ sale: null });
          }
        }}
      />
      <InProgressBills pos={pos} onCheckout={() => {}} />
      <TableMenuDialog
        open={!!tableMenu}
        onOpenChange={(open) => !open && setTableMenu(null)}
        tableLabel={tableMenu?.label ?? ""}
        sale={tableMenu?.sale ?? null}
        onCreateBill={() => setPicker({ sale: null })}
        onDeleteTable={() => {}}
        onAddProducts={() => setPicker({ sale: tableMenu?.sale ?? null })}
        onCheckout={() => {}}
      />
      {/* <ProductPickerDialog
        open={!!picker}
        onOpenChange={(open) => !open && setPicker(null)}
        sale={picker?.sale ?? null}
        items={[]}
        pos={pos as any}
        onClose={() => setPicker(null)}
      /> */}
    </div>
  );
}
