import Dexie, { type Table } from "dexie";
import type { PairedDevice, ProcessedOp, SyncOp } from "../../syncengine/types";
import type { Sale, SaleItem } from "../types/sales";
import type { ShopProfile, ClosingImport } from "../types/shop";
import type {
  CatalogueRequestPending,
  Charge,
  Client,
  DayClosure,
  EmployeeHistory,
  MonthlyOverview,
  ProductExpense,
  Setting,
  StockMovement,
  Subscription,
} from "../types/records";
import type { AlertSeverity } from "@/lib/alerts";
import type { Product } from "../types/sync";
import { applyEarlyVersions } from "./versions/early";
import { applyLateAVersions } from "./versions/late-a";
import { applyLateBVersions } from "./versions/late-b";
import { applyMiddleVersions } from "./versions/middle";

export class PosDatabase extends Dexie {
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  sale_items!: Table<SaleItem, string>;
  settings!: Table<Setting, string>;
  subscriptions!: Table<Subscription, string>;
  shop_profiles!: Table<ShopProfile, string>;
  clients!: Table<Client, string>;
  product_expenses!: Table<ProductExpense, number>;
  stock_movements!: Table<StockMovement, string>;
  day_closures!: Table<DayClosure, string>;
  closings!: Table<ClosingImport, string>;
  employee_history!: Table<EmployeeHistory, string>;
  catalogue_requests!: Table<CatalogueRequestPending, string>;
  /** Charges de service et charges d'exploitation, saisies par période (migration v26). */
  charges!: Table<Charge, string>;
  sync_ops!: Table<SyncOp, string>;
  monthly_overviews!: Table<MonthlyOverview, string>;
  processed_ops!: Table<ProcessedOp, string>;
  paired_devices!: Table<PairedDevice, string>;
  sync_lost_stock_alerts!: Table<
    {
      id: string;
      product_id: string;
      device_id: string;
      stock: number;
      threshold: number;
      severity: AlertSeverity;
      title: string;
      detail: string;
      to: string;
      created_at: number;
    },
    string
  >;

  constructor() {
    super("pos-db");
    applyEarlyVersions(this);
    applyMiddleVersions(this);
    applyLateAVersions(this);
    applyLateBVersions(this);
  }
}
