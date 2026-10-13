import { CARD_PRESETS, normalizeCardFields } from "@/lib/card-display";
import { CLUSTER_MAP } from "./clusters";
import { DEFAULT_PREFERENCES } from "./defaults";
import type { ClusterId, Preferences } from "./types";

const KEY = "pos_preferences";

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    const cluster = normalizeCluster(parsed.cluster);
    // Migration : features.tables prend le relais de tablesEnabled.
    // Si absent, on migre depuis l'ancien cluster : restaurant/bar → true, autres → false.
    const tablesFromCluster = cluster === "restaurant" || cluster === "bar";
    const featuresTables = parsed.features?.tables ?? parsed.tablesEnabled ?? tablesFromCluster;
    // Fusion avec les défauts, jamais remplacement : une version future qui ajoute une
    // préférence doit pouvoir lire un enregistrement écrit par la version d'avant.
    return {
      workspaceName: parsed.workspaceName?.trim() || DEFAULT_PREFERENCES.workspaceName,
      onboarded: parsed.onboarded === true,
      cluster,
      customDomain: typeof parsed.customDomain === "string" ? parsed.customDomain.trim() : "",
      customUnitType: normalizeCustomUnitType(parsed.customUnitType),
      features: {
        tables: featuresTables,
      },
      // `tablesEnabled` conservé pour compat (vieux enregistrements), lu mais plus écrit.
      tablesEnabled: parsed.tablesEnabled !== false,
      tables: normalizeTables(parsed.tables),
      phone: parsed.phone?.trim() || "",
      quarter: parsed.quarter?.trim() || "",
      ownerName: parsed.ownerName?.trim() || "",
      ownerPhoto: typeof parsed.ownerPhoto === "string" ? parsed.ownerPhoto : "",
      onboardingCompleted: parsed.onboardingCompleted === true,
      privacyAccepted: parsed.privacyAccepted === true,
      // Champs de card : nettoyés comme le reste. Un enregistrement tronqué ou écrit
      // par une version antérieure ne doit pas pouvoir rendre une card illisible.
      stockCardFields: normalizeCardFields(parsed.stockCardFields, CARD_PRESETS.standard),
      caisseCardFields: normalizeCardFields(parsed.caisseCardFields, CARD_PRESETS.compact),
    };
  } catch {
    // JSON corrompu ou localStorage inaccessible (mode privé strict) : les défauts
    // valent mieux qu'une application qui refuse de démarrer.
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Quota plein ou stockage refusé : la préférence ne survivra pas au rechargement,
      // mais l'application reste utilisable pour cette session.
    }
  }
  return next;
}

/**
 * Libellés nettoyés, dédoublonnés, ordre de saisie conservé.
 *
 * Le dédoublonnage n'est pas cosmétique : deux entrées « 3 » donneraient deux boutons
 * identiques dans la caisse, dont l'un ouvrirait une seconde addition sur la même table.
 * Une liste vidée retombe sur les défauts — une caisse sans aucune table à proposer
 * n'aurait plus de bouton du tout.
 */
function normalizeTables(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_PREFERENCES.tables;
  const cleaned = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  return unique.length > 0 ? unique : DEFAULT_PREFERENCES.tables;
}

function normalizeCluster(value: unknown): ClusterId {
  if (typeof value === "string" && value in CLUSTER_MAP) return value as ClusterId;
  return DEFAULT_PREFERENCES.cluster;
}

function normalizeCustomUnitType(value: unknown): "unit" | "weight" | undefined {
  return value === "unit" || value === "weight" ? value : undefined;
}
