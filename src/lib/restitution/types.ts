import type { ClosingImport } from "@/lib/db";

/** Schéma d'identification d'un payload JSON « ecaisse ». */
export const SCHEMA_APP = "ecaisse";
export const TYPE_RESTITUTION = "restitution";
export const TYPE_CLOSURE = "closure";
/** Version du format — incrémenter en cas de changement cassant. */
export const FORMAT_VERSION = 1;

/** Budget maximal (caractères) du QR de clôture : sous la capacité d'un QR robuste. */
export const QR_CHAR_BUDGET = 1500;

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

export type ClosingImportResult =
  | { status: "imported"; closing: ClosingImport }
  | { status: "duplicate"; closing: ClosingImport }
  | { status: "mismatch"; reason: string };
