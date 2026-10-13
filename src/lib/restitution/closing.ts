import { getSaleItemsForSales, listSales } from "@/lib/db";
import { lineCategory, lineProfit, lineRevenue } from "@/lib/analytics";
import {
  FORMAT_VERSION,
  QR_CHAR_BUDGET,
  SCHEMA_APP,
  TYPE_CLOSURE,
  type ClosingCategory,
  type ClosingPayload,
  type ClosingProduct,
  type RestitutionRequest,
} from "./types";
import { hex, jsonSize, tryParseObj } from "./utils";

/**
 * Agrège les ventes d'une période en un payload de clôture. Appelé côté EMPLOYÉ après le
 * scan du QR de restitution. `from`/`to` bornent la période (to exclusif) — permet de
 * découper la journée en plusieurs clôtures (par service, par plage, par table…).
 */
export async function buildClosingPayload(
  request: RestitutionRequest,
  from: number,
  to: number,
  employeeName: string,
  employeeDevice: string,
): Promise<ClosingPayload> {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    throw new Error("Période de clôture invalide.");
  }
  const sales = await listSales(from, to);
  const items = await getSaleItemsForSales(sales.map((s) => s.id));

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const profit = items.reduce((sum, i) => sum + lineProfit(i), 0);
  const salesCount = sales.length;
  const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const categoryMap = new Map<string, ClosingCategory>();
  const productMap = new Map<string, ClosingProduct>();
  for (const item of items) {
    const cat = lineCategory(item);
    const key = item.product_id ?? item.name;
    categoryMap.set(cat, {
      category: cat,
      revenue: (categoryMap.get(cat)?.revenue ?? 0) + lineRevenue(item),
      profit: (categoryMap.get(cat)?.profit ?? 0) + lineProfit(item),
    });
    productMap.set(key, {
      name: item.name,
      quantity: (productMap.get(key)?.quantity ?? 0) + item.quantity,
      revenue: (productMap.get(key)?.revenue ?? 0) + lineRevenue(item),
      profit: (productMap.get(key)?.profit ?? 0) + lineProfit(item),
    });
  }

  const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);
  const byProductAll = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

  const closingBase: Omit<ClosingPayload, "id" | "byProduct"> = {
    v: FORMAT_VERSION,
    app: SCHEMA_APP,
    type: TYPE_CLOSURE,
    shop: request.shop,
    employeeName: employeeName.trim() || "",
    employeeDevice,
    ownerDevice: request.device,
    from,
    to,
    sales: salesCount,
    items: itemsCount,
    revenue,
    profit,
    byCategory,
  };

  const byProduct = fitProducts(closingBase, byProductAll);
  const id = await deterministId({ ...closingBase, byProduct, id: "" });
  return { ...closingBase, byProduct, id };
}

/** Retient les produits qui tiennent dans le budget de caractères du QR, sans jamais
 *  écarter tous les produits si le premier dépasse déjà le budget. */
function fitProducts(
  closing: Omit<ClosingPayload, "id" | "byProduct">,
  products: ClosingProduct[],
): ClosingProduct[] {
  const kept: ClosingProduct[] = [];
  let size = jsonSize({ ...closing, id: "", byProduct: [] });
  for (const p of products) {
    const candidate = [...kept, p];
    const nextSize = jsonSize({ ...closing, id: "", byProduct: candidate });
    if (nextSize <= QR_CHAR_BUDGET || kept.length === 0) {
      kept.push(p);
      size = nextSize;
    } else {
      break;
    }
  }
  void size;
  return kept;
}

/** Identifiant déterministe : hash stable du contenu agrégé, résistant aux re-scans. */
async function deterministId(closing: ClosingPayload): Promise<string> {
  const source =
    `${closing.employeeDevice}|${closing.employeeName}|${closing.ownerDevice}|${closing.from}|${closing.to}|` +
    `${closing.revenue}|${closing.profit}|${closing.sales}|${closing.items}|` +
    closing.byCategory.map((c) => `${c.category}:${c.revenue}:${c.profit}`).join(",") +
    "|" +
    closing.byProduct.map((p) => `${p.name}:${p.quantity}:${p.revenue}:${p.profit}`).join(",");
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    return "cl_" + hex(digest).slice(0, 16);
  } catch {
    // Pas de crypto.subtle (contexte non sécurisé) : repli non lu, mais unique.
    return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Lit un QR de clôture. Renvoie `null` si méconnaissable ou invalide. */
export function parseClosingPayload(text: string): ClosingPayload | null {
  const data = tryParseObj(text);
  if (!data) return null;
  if (
    data.app !== SCHEMA_APP ||
    data.type !== TYPE_CLOSURE ||
    typeof data.id !== "string" ||
    !data.id ||
    typeof data.employeeDevice !== "string" ||
    !data.employeeDevice ||
    typeof data.ownerDevice !== "string" ||
    !data.ownerDevice ||
    typeof data.revenue !== "number" ||
    typeof data.profit !== "number" ||
    typeof data.sales !== "number"
  ) {
    return null;
  }
  const sanitize = <T>(arr: unknown): T[] => (Array.isArray(arr) ? (arr as T[]) : []);
  return {
    v: FORMAT_VERSION,
    app: SCHEMA_APP,
    type: TYPE_CLOSURE,
    id: data.id,
    shop: typeof data.shop === "string" ? data.shop : "",
    employeeName: typeof data.employeeName === "string" ? data.employeeName : "",
    employeeDevice: data.employeeDevice,
    ownerDevice: data.ownerDevice,
    from: typeof data.from === "number" ? data.from : 0,
    to: typeof data.to === "number" ? data.to : 0,
    sales: data.sales,
    items: typeof data.items === "number" ? data.items : 0,
    revenue: data.revenue,
    profit: data.profit,
    byCategory: sanitize<ClosingCategory>(data.byCategory),
    byProduct: sanitize<ClosingProduct>(data.byProduct),
  };
}
