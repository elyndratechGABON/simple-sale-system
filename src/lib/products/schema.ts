/**
 * Schémas de validation Zod par cluster (activité métier).
 * Validation à l'écriture pour garantir l'intégrité des données.
 */

import { z } from "zod";
import { ClusterId } from "@/lib/settings";
import type { FieldKey } from "./types";
import { FIELDS_BY_CLUSTER, getVisibleFields, getRequiredFields } from "./clusters";

/** Schéma de base commun à tous les clusters */
export const baseProductSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  photo: z.string().url().optional().or(z.literal("")),
  price: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative().optional(),
  stock: z.number().nonnegative().optional(),
  category: z.string().min(1, "Catégorie requise"),
  unit: z.enum(["piece", "meter", "liter"]).optional(),
  weight: z.number().nonnegative().optional(),
  expiry: z.number().int().positive().optional(),
  serial: z.string().max(100).optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().int().nonnegative().optional(),
        cost: z.number().int().nonnegative().optional(),
        stock: z.number().nonnegative().optional(),
        period: z.enum(["hour", "day", "week", "month", "year"]).optional(),
      }),
    )
    .optional(),
  rental: z
    .object({
      hour: z.number().int().nonnegative().optional(),
      day: z.number().int().nonnegative().optional(),
      week: z.number().int().nonnegative().optional(),
      month: z.number().int().nonnegative().optional(),
      year: z.number().int().nonnegative().optional(),
    })
    .optional(),
  duration: z.number().int().positive().optional(),
  allergens: z.string().max(500).optional(),
  // Champs supplémentaires pas dans la matrice mais utiles
  unitType: z.enum(["unit", "weight", "mixed"]).optional(),
  weightUnit: z.string().optional(),
  expiryDate: z.number().int().positive().optional(),
  serialNumber: z.string().max(100).optional(),
  min_stock: z.number().int().positive().optional(),
  is_asset: z.boolean().optional(),
  rental_pricing: z
    .object({
      hour: z.number().int().nonnegative().optional(),
      day: z.number().int().nonnegative().optional(),
      week: z.number().int().nonnegative().optional(),
      month: z.number().int().nonnegative().optional(),
      year: z.number().int().nonnegative().optional(),
    })
    .optional(),
  deposit_amount: z.number().int().nonnegative().optional(),
  total_units: z.number().int().positive().optional(),
  return_date: z.number().int().positive().optional(),
  expected_return_date: z.number().int().positive().optional(),
  reminderDate: z.number().int().positive().optional(),
});

/** Schémas spécifiques par cluster — champs requis/enforced */
export const clusterSchemas: Record<string, z.ZodObject<z.ZodRawShape>> = {
  retail: baseProductSchema.extend({
    stock: z.number().int().nonnegative(), // requis
    category: z.string().min(1), // requis
    expiry: z.number().int().positive().optional(),
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int().nonnegative().optional(),
          cost: z.number().int().nonnegative().optional(),
          stock: z.number().nonnegative().optional(),
        }),
      )
      .optional(),
  }),

  restaurant: baseProductSchema.extend({
    stock: z.number().nonnegative().optional(), // pas de stock
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int().nonnegative().optional(),
          cost: z.number().int().nonnegative().optional(),
          stock: z.number().nonnegative().optional(),
        }),
      )
      .optional(),
    allergens: z.string().max(500).optional(),
  }),

  bar: baseProductSchema.extend({
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int().nonnegative().optional(),
          cost: z.number().int().nonnegative().optional(),
          stock: z.number().nonnegative().optional(),
        }),
      )
      .optional(),
  }),

  service: baseProductSchema.extend({
    cost: z.never(), // pas de coût pour service
    stock: z.never(), // pas de stock
    variants: z.undefined(), // pas de variantes
    allergens: z.string().max(500).optional(),
  }),

  clothing: baseProductSchema.extend({
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int().nonnegative().optional(),
          cost: z.number().int().nonnegative().optional(),
          stock: z.number().nonnegative().optional(),
        }),
      )
      .min(1, "Au moins une variante requise"), // variantes obligatoires
  }),

  weight: baseProductSchema.extend({
    unit: z.literal("piece"), // forcé à piece pour weight
    weight: z.number().nonnegative(), // requis
    stock: z.number().int().nonnegative(), // requis
    expiry: z.number().int().positive().optional(),
    variants: z.undefined(), // pas de variantes
  }),

  magasin: baseProductSchema.extend({
    serial: z.string().max(100).optional(), // serial optionnel
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int().nonnegative().optional(),
          cost: z.number().int().nonnegative().optional(),
          stock: z.number().nonnegative().optional(),
        }),
      )
      .optional(),
  }),

  personnalise: baseProductSchema.extend({
    unit: z.enum(["piece", "meter", "liter"]).optional(), // flexible
    weight: z.number().nonnegative().optional(),
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().int().nonnegative().optional(),
          cost: z.number().int().nonnegative().optional(),
          stock: z.number().nonnegative().optional(),
        }),
      )
      .optional(),
  }),

  location: baseProductSchema.extend({
    serial: z.string().max(100), // requis
    rental: z
      .object({
        hour: z.number().int().nonnegative().optional(),
        day: z.number().int().nonnegative().optional(),
        week: z.number().int().nonnegative().optional(),
        month: z.number().int().nonnegative().optional(),
        year: z.number().int().nonnegative().optional(),
      })
      .refine((r) => Object.values(r).some((v) => v !== undefined && v > 0), {
        message: "Au moins un tarif de location requis",
      }),
    duration: z.number().int().positive(), // requis
    is_asset: z.literal(true), // forcé
  }),
};

/** Génère un schéma Zod pour un cluster donné */
export function getSchemaForCluster(clusterId: string): z.ZodSchema {
  const schema = clusterSchemas[clusterId];
  if (!schema) {
    // Fallback : schéma de base + champs requis du cluster
    return baseProductSchema;
  }
  return schema;
}

/** Valide un produit pour un cluster donné */
export function validateProductForCluster(clusterId: string, data: unknown) {
  const schema = getSchemaForCluster(clusterId);
  return schema.safeParse(data);
}

/** Renvoie les erreurs de validation formatées */
export function formatValidationErrors(result: z.SafeParseReturnType<unknown, unknown>): string[] {
  if (result.success) return [];
  return result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}
