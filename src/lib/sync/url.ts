// `?.` : sous Node (tests, scripts), `window = globalThis` existe mais SANS `location` —
// le simple `typeof window !== "undefined"` ne suffisait pas.
const PROJECT_DOMAIN =
  typeof window !== "undefined" && window.location ? window.location.origin : "";

/** Adresse de l'orchestrateur. Compilée au build via VITE_ORCHESTRATOR_URL, sinon le domaine de l'app. */
export function getOrchestratorUrl(): string {
  const override = (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined)?.trim();
  return override || PROJECT_DOMAIN;
}

/**
 * Adresse du RELAIS d'échange d'opérations (canal P2P). Découplée de l'orchestrateur :
 * le relais peut être hébergé ailleurs (ex. Neon/Fonction Vercel) et rester allumé
 * indépendamment de la machine. Compilée au build via VITE_OPS_URL ; en l'absence de
 * cette variable, le canal ops retombe sur l'orchestrateur historique `/api/v1/ops`.
 */
export function getOpsRelayUrl(): string {
  const override = (import.meta.env.VITE_OPS_URL as string | undefined)?.trim();
  return override || getOrchestratorUrl();
}

/**
 * Jeton du relais ops (header `x-ops-token`), compilation embarquée via VITE_OPS_TOKEN.
 * Vide en l'absence de variable → la caisse parle à un relais ouvert (dev ou orchestrateur
 * historique qui n'exige rien). En production, le relais Vercel exige ce jeton : sans lui,
 * push/pull répondent 401 et l'échange reste silencieusement en retrait (jamais bloquant).
 */
export function getOpsToken(): string {
  return (import.meta.env.VITE_OPS_TOKEN as string | undefined)?.trim() || "";
}
