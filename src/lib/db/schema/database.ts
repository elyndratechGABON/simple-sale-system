import Dexie, { type Table } from "dexie";
import type { PairedDevice, ProcessedOp, SyncOp } from "../../syncengine/types";
import type { Sale, SaleItem } from "../types/sales";
import type { ShopProfile, ClosingImport } from "../types/shop";
import type {
  CatalogueRequestPending,
  Client,
  DayClosure,
  EmployeeHistory,
  MonthlyOverview,
  ProductExpense,
  Setting,
  StockMovement,
  Subscription,
} from "../types/records";
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
  sync_ops!: Table<SyncOp, string>;
  monthly_overviews!: Table<MonthlyOverview, string>;
  processed_ops!: Table<ProcessedOp, string>;
  paired_devices!: Table<PairedDevice, string>;

  constructor() {
    super("pos-db");
    applyEarlyVersions(this);
    applyMiddleVersions(this);
    applyLateAVersions(this);
    applyLateBVersions(this);
  }
}
