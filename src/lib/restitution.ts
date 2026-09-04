// Restitution des ventes d'un employé vers son propriétaire, SANS serveur, par un
// échange de DEUX QR optiques (à sens unique, donc aller-retour) :
//
//   Phase A — le PROPRIÉTAIRE génère un QR de « restitution » (son identité d'appareil).
//   Phase B — l'EMPLOYÉ le scanne (dans son accueil), l'app agrège ses ventes de la
//             période et affiche un QR de clôture contenant les AGRÉGATS (jamais les
//             lignes brutes, la capacité d'un QR est bornée).
//   Phase C — le PROPRIÉTAIRE scanne ce QR de sortie dans son espace Employés, qui
//             importe les agrégats dans `closings` (anti-doublon par identifiant
//             déterministe).
//
// Le QR ne transporte donc RIEN de confidentiel : des totaux, comme une note de caisse.
// Les montants sont des entiers FCFA, cohérents avec `listSales`/`analytics.ts`.
import {
  getClosing,
  listSales,
  saveClosingImport,
  getSaleItemsForSales,
  type ClosingImport,
  type SyncFields,
} from "@/lib/db";
import { lineRevenue, lineProfit, lineCategory } from "@/lib/analytics";
import type { SaleItem } from "@/lib/db";

/** Schéma d'identification d'un payload JSON « ecaisse ». */
const SCHEMA_APP = "ecaisse";
const TYPE_RESTITUTION = "restitution";
const TYPE_CLOSURE = "closure";
/** Version du format — incrémenter en cas de changement cassant. */
const FORMAT_VERSION = 1;

/** Budget maximal (caractères) du QR de clôture : sous la capacité d'un QR robuste. */
const QR_CHAR_BUDGET = 1500;

// ---------------------------------------------------------------------------
// Phase A — QR de restitution (propriétaire → employé)
// ---------------------------------------------------------------------------

/** Payload du QR de restitution : identité de la caisse qui récupère les données. */
export interface RestitutionRequest {
  v: typeof FORMAT_VERSION;
  app: typeof SCHEMA_APP;
  type: typeof TYPE_RESTITUTION;
  /** Enseigne / nom de compte du propriétaire (affiché à l'employé). */
  shop: string;
  /** deviceId du PROPRIÉTAIRE — cible de la restitution. */
  device: string;
  /** Horodatage de génération (info, non vérifié). */
  ts: number;
}

/**
 * Fabrique le payload JSON du QR de restitution d'un propriétaire.
 * @param shop    Enseigne / nom de compte du propriétaire.
 * @param device  deviceId du propriétaire (l'employé lui rendra ses agrégats).
 */
export function buildRestitutionRequest(shop: string, device: string): string {
  const request: RestitutionRequest = {
    v: FORMAT_VERSION,
    app: SCHEMA_APP,
    type: TYPE_RESTITUTION,
    shop: shop.trim() || "Ma boutique",
    device,
    ts: Date.now(),
  };
  return JSON.stringify(request);
}

/** Lit un QR de restitution. Renvoie `null` si méconnaissable ou invalide. */
export function parseRestitutionRequest(text: string): RestitutionRequest | null {
  const data = tryParseObj(text);
  if (!data) return null;
  if (
    data.app !== SCHEMA_APP ||
    data.type !== TYPE_RESTITUTION ||
    typeof data.device !== "string" ||
    data.device.trim().length === 0 ||
    typeof data.shop !== "string"
  ) {
    return null;
  }
  return {
    v: FORMAT_VERSION,
    app: SCHEMA_APP,
    type: TYPE_RESTITUTION,
    shop: data.shop,
    device: data.device.trim(),
    ts: typeof data.ts === "number" ? data.ts : Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Agrégats — phase B (côté employé)
// ---------------------------------------------------------------------------

/** Répartition d'une clôture par catégorie produit. */
export interface ClosingCategory {
  category: string;
  revenue: number;
  profit: number;
}

/** Répartition d'une clôture par produit (agrégé par nom de ligne). */
export interface ClosingProduct {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

/** Payload du QR de clôture que l'employé présente au propriétaire. */
export interface ClosingPayload {
  v: typeof FORMAT_VERSION;
  app: typeof SCHEMA_APP;
  type: typeof TYPE_CLOSURE;
  /** Identifiant ANTI-DOUBLON, déterministe sur le contenu. */
  id: string;
  /** Enseigne de la caisse de l'employé. */
  shop: string;
  /** Nom du vendeur (libellé), vide si aucun nom saisi. */
  employeeName: string;
  /** deviceId de la caisse EMPLOYÉ. */
  employeeDevice: string;
  /** deviceId du PROPRIÉTAIRE cible, recopié du QR de restitution. */
  ownerDevice: string;
  /** Début de la période couverte, en ms. */
  from: number;
  /** Fin EXCLUSIVE de la période couverte, en ms. */
  to: number;
  sales: number;
  items: number;
  revenue: number;
  profit: number;
  byCategory: ClosingCategory[];
  /** Classement par chiffre d'affaires décroissant — peut être tronqué sous le budget QR. */
  byProduct: ClosingProduct[];
}

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

// ---------------------------------------------------------------------------
// Phase C — import côté propriétaire
// ---------------------------------------------------------------------------

export type ClosingImportResult =
  | { status: "imported"; closing: ClosingImport }
  | { status: "duplicate"; closing: ClosingImport }
  | { status: "mismatch"; reason: string };

/**
 * Importe une clôture lue depuis le QR de l'employé. Vérifie l'anti-doublon : si l'id
 * existe déjà, la clôture est déjà dans la caisse du propriétaire → `duplicate`.
 * @param ownerDevice  deviceId du PROPRIÉTAIRE courant ; doit correspondre à
 *                     `payload.ownerDevice` (sinon le QR visait une autre caisse).
 */
export async function applyClosingImport(
  payload: ClosingPayload,
  ownerDevice: string,
): Promise<ClosingImportResult> {
  if (payload.ownerDevice && payload.ownerDevice !== ownerDevice) {
    return { status: "mismatch", reason: "Ce QR n'est pas destiné à cet appareil." };
  }
  const existing = await getClosing(payload.id);
  if (existing) return { status: "duplicate", closing: existing };

  const now = Date.now();
  const closing: Omit<ClosingImport, keyof SyncFields> = {
    id: payload.id,
    shopName: payload.shop,
    employeeDeviceId: payload.employeeDevice,
    employeeName: payload.employeeName,
    ownerDeviceId: ownerDevice,
    periodFrom: payload.from,
    periodTo: payload.to,
    salesCount: payload.sales,
    itemsCount: payload.items,
    revenue: Math.round(payload.revenue),
    profit: Math.round(payload.profit),
    importedAt: now,
    byCategory: payload.byCategory,
    byProduct: payload.byProduct,
  };
  await saveClosingImport(closing);
  const saved = await getClosing(payload.id);
  if (!saved) return { status: "mismatch", reason: "La clôture n'a pas pu être enregistrée." };
  return { status: "imported", closing: saved };
}

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

function tryParseObj(text: unknown): Record<string, unknown> | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || !trimmed.startsWith("{")) return null;
  try {
    const data = JSON.parse(trimmed) as unknown;
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function jsonSize(value: unknown): number {
  return JSON.stringify(value).length;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
