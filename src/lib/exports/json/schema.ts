import { z } from "zod";
import type { DatabaseSnapshot } from "../../db";

// v1 : products / sales / sale_items, sans champs de synchronisation.
// v2 : ajoute le store `expenses`, les champs de synchronisation et `customers_count`.
// v3 : supprime `expenses` (module Dépenses retiré du produit). Les fichiers v1 et v2
// restent restaurables : le champ est ignoré par la validation, cf. `parseBackup`.
// v4 : ajoute le store `subscriptions` (abonnements clients). Le champ est OPTIONNEL à
// la lecture : une sauvegarde v3 restaure un stock d'abonnements vide, jamais une erreur.
export const BACKUP_FORMAT_VERSION = 5;

export interface BackupFile extends DatabaseSnapshot {
  format: "caisse-pos-backup";
  version: number;
  exportedAt: string;
}

export interface BackupSummary {
  version: number;
  exportedAt?: string;
  products: number;
  sales: number;
  subscriptions: number;
  productExpenses: number;
}

// Champs de synchronisation, absents des sauvegardes v1 : on leur donne des valeurs de
// repli plutôt que de rejeter le fichier. Un utilisateur qui restaure une vieille
// sauvegarde ne doit pas se heurter à une erreur de format.
const syncFields = {
  updated_at: z.number().optional(),
  deleted_at: z.number().optional(),
  sync_status: z.enum(["local", "synced"]).optional(),
};

const category = z.enum(["Boisson", "Snack", "Service", "Autre"]);

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().optional(),
  price: z.number(),
  // `stock` vaut Infinity pour un stock illimité, et JSON.stringify écrit `null` pour
  // Infinity. `nullable` n'est donc pas de la tolérance : c'est le cas nominal des
  // services. La reconversion se fait dans `normalize`.
  stock: z.number().nullable(),
  category,
  type: z.enum(["product", "service"]).optional(),
  serialNumber: z.string().optional(),
  // V23 : `unit` vaut "kg" depuis l'unification. Le laisser sur l'ancien enum faisait
  // ECHOUER la validation d'une sauvegarde contenant un produit au kilo - zod retire
  // alors la cle, et la restauration perdait l'unite. `unitType`/`weightUnit` ont
  // disparu avec la migration ; ils restent acceptes en lecture pour qu'une sauvegarde
  // ecrite par une version anterieure se restaure (normalize les replie sur `unit`).
  unit: z.enum(["piece", "kg", "liter", "meter"]).optional(),
  unitType: z.enum(["unit", "weight"]).optional(),
  weightUnit: z.string().optional(),
  ...syncFields,
});

const saleSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  total: z.number(),
  cash_given: z.number(),
  change_due: z.number(),
  day_closed: z.boolean(),
  customers_count: z.number().optional(),
  // Tournées encaissées d'une addition ouverte : sans lui, zod retirerait la clé à la
  // restauration et une table partiellement encaissée reparaîtrait « rien payé ».
  rounds_paid: z.number().optional(),
  table: z.string().optional(),
  status: z.enum(["open", "paid"]).optional(),
  served_at: z.number().optional(),
  ...syncFields,
});

const saleItemSchema = z.object({
  id: z.string(),
  sale_id: z.string(),
  product_id: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  price_at_sale: z.number(),
  cost_at_sale: z.number().optional(),
  category_at_sale: category.optional(),
  serial_number: z.string().optional(),
  ...syncFields,
});

const subscriptionSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  phone: z.string().optional(),
  plan: z.string(),
  price: z.number(),
  startDate: z.number(),
  endDate: z.number(),
  paid: z.boolean(),
  ...syncFields,
});

const productExpenseSchema = z.object({
  id: z.number().optional(),
  product_id: z.string(),
  period_from: z.number(),
  period_to: z.number(),
  cost: z.number(),
  ...syncFields,
});

const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  birthday: z.number().optional(),
  notes: z.string().optional(),
  ...syncFields,
});

// Bilan mensuel du calculateur de bénéfices : local, sans champ de synchronisation.
const monthlyOverviewSchema = z.object({
  id: z.string(),
  charges: z.number(),
  stock_override: z.number().nullable(),
  cost_complement: z.number().nullable(),
  updated_at: z.number().optional(),
});

export const backupSchema = z.object({
  format: z.literal("caisse-pos-backup"),
  version: z.number(),
  exportedAt: z.string().optional(),
  products: z.array(productSchema),
  sales: z.array(saleSchema),
  sale_items: z.array(saleItemSchema),
  // `expenses` n'existe plus en v3. Le champ des fichiers v1/v2 est simplement ignoré :
  // zod laisse passer les clés inconnues, et la migration Dexie v5 a déjà purgé le store.
  // `subscriptions` n'existe qu'en v4 : absent d'un fichier v3, lu comme liste vide.
  subscriptions: z.array(subscriptionSchema).optional(),
  product_expenses: z.array(productExpenseSchema).optional(),
  clients: z.array(clientSchema).optional(),
  monthly_overviews: z.array(monthlyOverviewSchema).optional(),
});
