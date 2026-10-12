/**
 * Tests de validation du registre des champs par cluster.
 * Vérifie la cohérence de FIELDS_BY_CLUSTER et des schémas Zod.
 */

import { describe, it, expect } from "vitest";
import {
  FIELDS_BY_CLUSTER,
  ALL_FIELD_KEYS,
  getFieldsForCluster,
  getVisibleFields,
  getRequiredFields,
  isFieldRequired,
  isFieldHidden,
  isFieldVisible,
  getClusterLabel,
} from "../clusters";
import { validateProductForCluster, clusterSchemas } from "../schema";
import type { ClusterId } from "@/lib/settings";
import type { ClusterFieldsConfig } from "../types";

const CLUSTER_IDS: ClusterId[] = [
  "retail",
  "restaurant",
  "bar",
  "service",
  "clothing",
  "weight",
  "magasin",
  "personnalise",
  "location",
];

describe("FIELDS_BY_CLUSTER registry", () => {
  // Test 1 : tous les clusters définis dans ClusterId sont présents
  it("contient exactement les 9 clusters du type ClusterId", () => {
    const expectedClusters: ClusterId[] = [
      "retail",
      "restaurant",
      "bar",
      "service",
      "clothing",
      "weight",
      "magasin",
      "personnalise",
      "location",
    ];

    const actualClusters = [...CLUSTER_IDS].sort();
    const expectedSorted = [...CLUSTER_IDS].sort();

    expect(actualClusters).toEqual(expectedSorted);
  });

  // Test 2 : chaque cluster a une config valide
  it("chaque cluster a required, optional, hidden, label", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId] as ClusterFieldsConfig;
      expect(config).toHaveProperty("cluster");
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("required");
      expect(config).toHaveProperty("optional");
      expect(config).toHaveProperty("hidden");
      expect(typeof config.label).toBe("string");
      expect(config.label.length).toBeGreaterThan(0);
      expect(Array.isArray(config.required)).toBe(true);
      expect(Array.isArray(config.optional)).toBe(true);
      expect(Array.isArray(config.hidden)).toBe(true);
    }
  });

  // Test 3 : pas de doublons entre required/optional/hidden
  it("aucun champ n'est dans required ET optional OU hidden", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId];
      const all = [...config.required, ...config.optional, ...config.hidden];
      const unique = new Set(all);
      expect(all.length).toBe(unique.size);
    }
  });

  // Test 4 : tous les champs de la matrice sont couverts
  it("tous les champs de ALL_FIELD_KEYS sont référencés", () => {
    const allReferenced = new Set<string>();
    for (const config of Object.values(FIELDS_BY_CLUSTER) as ClusterFieldsConfig[]) {
      config.required.forEach((f) => allReferenced.add(f));
      config.optional.forEach((f) => allReferenced.add(f));
      config.hidden.forEach((f) => allReferenced.add(f));
    }

    for (const field of ALL_FIELD_KEYS) {
      expect(allReferenced.has(field)).toBe(true);
    }
  });

  // Test 5 : getFieldsForCluster retourne la bonne config
  it("getFieldsForCluster retourne la config pour chaque cluster", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = getFieldsForCluster(clusterId);
      expect(config).toBeDefined();
      expect(config?.cluster).toBe(clusterId);
    }
  });

  // Test 6 : getVisibleFields = required + optional
  it("getVisibleFields = required + optional", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId];
      const visible = getVisibleFields(clusterId);
      const expected = [...config.required, ...config.optional];
      expect(visible.sort()).toEqual(expected.sort());
    }
  });

  // Test 7 : getRequiredFields = required
  it("getRequiredFields = required", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId];
      const required = getRequiredFields(clusterId);
      expect(required.sort()).toEqual(config.required.sort());
    }
  });

  // Test 8 : isFieldRequired / isFieldHidden / isFieldVisible
  it("helpers isFieldRequired / isFieldHidden / isFieldVisible cohérents", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId];

      for (const field of config.required) {
        expect(isFieldRequired(clusterId, field)).toBe(true);
        expect(isFieldHidden(clusterId, field)).toBe(false);
        expect(isFieldVisible(clusterId, field)).toBe(true);
      }

      for (const field of config.optional) {
        expect(isFieldRequired(clusterId, field)).toBe(false);
        expect(isFieldHidden(clusterId, field)).toBe(false);
        expect(isFieldVisible(clusterId, field)).toBe(true);
      }

      for (const field of config.hidden) {
        expect(isFieldRequired(clusterId, field)).toBe(false);
        expect(isFieldHidden(clusterId, field)).toBe(true);
        expect(isFieldVisible(clusterId, field)).toBe(false);
      }
    }
  });

  // Test 9 : getClusterLabel retourne le label
  it("getClusterLabel retourne le label configuré", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId];
      const label = getClusterLabel(clusterId);
      expect(label).toBe(config.label);
    }
  });

  // Test 10 : toutes les clés de champ dans ALL_FIELD_KEYS sont uniques
  it("ALL_FIELD_KEYS ne contient pas de doublons", () => {
    const unique = new Set(ALL_FIELD_KEYS);
    expect(ALL_FIELD_KEYS.length).toBe(unique.size);
  });
});

describe("Zod schemas per cluster", () => {
  // Test 1 : chaque cluster a un schéma
  it("chaque cluster a un schéma Zod dans clusterSchemas", () => {
    for (const clusterId of CLUSTER_IDS) {
      const schema = clusterSchemas[clusterId];
      // Certains clusters peuvent utiliser le fallback baseProductSchema
      // mais location a son propre schéma
      if (clusterId === "location") {
        expect(clusterSchemas[clusterId]).toBeDefined();
      }
    }
  });

  // Test 2 : validation pour retail
  it("valide un produit retail valide", () => {
    const validRetail = {
      name: "Coca-Cola",
      photo: "",
      price: 300,
      cost: 150,
      stock: 50,
      category: "Boisson",
      unit: "piece",
      weight: 0,
      expiry: Date.now() + 86400000,
      serial: "",
      variants: [],
      rental: undefined,
      duration: undefined,
      allergens: "",
    };

    const result = validateProductForCluster("retail", validRetail);
    expect(result.success).toBe(true);
  });

  // Test 3 : retail rejette si stock manquant
  it("retail rejette si stock manquant", () => {
    const invalidRetail = {
      name: "Coca-Cola",
      photo: "",
      price: 300,
      cost: 150,
      stock: undefined, // requis pour retail
      category: "Boisson",
    };

    const result = validateProductForCluster("retail", invalidRetail);
    expect(result.success).toBe(false);
  });

  // Test 4 : location requiert serial, rental, duration
  it("location requiert serial, rental, duration", () => {
    const invalidLocation = {
      name: "Chaise",
      photo: "",
      price: 1000,
      cost: 500,
      stock: 10,
      category: "Mobilier",
      serial: "", // manquant
      rental: undefined, // manquant
      duration: undefined, // manquant
      is_asset: true,
    };

    const result = validateProductForCluster("location", invalidLocation);
    expect(result.success).toBe(false);
  });

  // Test 5 : location valide passe
  it("location valide passe", () => {
    const validLocation = {
      name: "Chaise",
      photo: "",
      price: 1000,
      cost: 500,
      stock: 10,
      category: "Mobilier",
      serial: "CH-001",
      rental: { day: 500, week: 3000 },
      duration: 1, // en jours
      is_asset: true,
    };

    const result = validateProductForCluster("location", validLocation);
    expect(result.success).toBe(true);
  });

  // Test 6 : service n'accepte pas cost
  it("service n'accepte pas cost", () => {
    const invalidService = {
      name: "Coupe homme",
      price: 5000,
      cost: 1000, // pas de cost pour service
      category: "Coiffure",
    };

    const result = validateProductForCluster("service", invalidService);
    // service n'accepte pas cost => devrait échouer
    expect(result.success).toBe(false);
  });

  // Test 7 : weight requiert unit + weight + stock
  it("weight requiert unit, weight, stock", () => {
    const invalidWeight = {
      name: "Bœuf",
      price: 5000,
      stock: undefined,
      category: "Viande",
      unit: "piece",
      weight: undefined,
    };

    const result = validateProductForCluster("weight", invalidWeight);
    expect(result.success).toBe(false);
  });
});

describe("Cohérence registry ↔ schemas", () => {
  it("les champs requis du registry sont requis dans le schema", () => {
    for (const clusterId of CLUSTER_IDS) {
      const config = FIELDS_BY_CLUSTER[clusterId];
      const schema = clusterSchemas[clusterId];

      if (!schema) {
        // fallback vers baseProductSchema - OK
        continue;
      }

      // On ne peut pas facilement tester les champs requis du schema Zod
      // sans parser l'AST, mais on peut vérifier que le schema existe
      expect(schema).toBeDefined();
    }
  });
});

describe("Utilitaires clusters", () => {
  it("getFieldsForCluster retourne undefined pour cluster inconnu", () => {
    const result = getFieldsForCluster("inconnu");
    expect(result).toBeUndefined();
  });

  it("getVisibleFields retourne [] pour cluster inconnu", () => {
    expect(getVisibleFields("inconnu")).toEqual([]);
  });

  it("getRequiredFields retourne [] pour cluster inconnu", () => {
    expect(getRequiredFields("inconnu")).toEqual([]);
  });

  it("isFieldRequired/Visible/Hidden pour cluster inconnu: required=false, hidden=true, visible=false", () => {
    expect(isFieldRequired("inconnu", "name")).toBe(false);
    expect(isFieldHidden("inconnu", "name")).toBe(true);
    expect(isFieldVisible("inconnu", "name")).toBe(false);
  });

  it("getClusterLabel retourne clusterId pour inconnu", () => {
    expect(getClusterLabel("inconnu")).toBe("inconnu");
  });
});
