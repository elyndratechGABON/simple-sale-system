// SNIPPET ORCHESTRATEUR — le point de branchement de l'app vers la plateforme.
//
// Avant de déployer une app, un seul réglage est nécessaire : l'adresse de l'orchestrateur.
// Par défaut c'est le domaine même de l'app (`window.location.origin`) — l'orchestrateur est
// servi par le même projet Vercel (`/api/*`) — donc rien à configurer pour une app déployée
// sur le domaine enregistré. Une app tierce sur un autre domaine passe par
// VITE_ORCHESTRATOR_URL. L'orchestrateur identifie le projet grâce au domaine envoyé
// (`project_domain`) : c'est le domaine qu'on enregistre dans sa console.
//
// Rien ici ne doit jamais bloquer l'application : hors ligne, serveur injoignable ou domaine
// non enregistré, on échoue en silence et on réessaiera au prochain démarrage ou au prochain
// retour en ligne. C'est le flux voulu — la caisse est un outil offline-first.
//
// Le protocole réel vit dans src/lib/gatekeeper.ts (handshake → commandes → sync-data).
// Ce module orchestre l'appel périodique et construit le payload d'agrégats. Depuis le moteur
// P2P, un SECOND canal y est branché : l'échange d'opérations entre appareils du même compte
// (`syncengine/transport.ts`, relais `/api/v1/ops`). Il est DÉCOUPLÉ du handshake : la
// convergence stock/ventes se fait même quand l'orchestrateur est injoignable (ex. employé
// hors du réseau du comptoir) — et sans jamais faire tomber la caisse. L'adresse de ce relais
// est DÉCOUPLÉE de l'orchestrateur
// (`getOpsRelayUrl`, via `VITE_OPS_URL`) : le relais peut être hébergé ailleurs et rester
// allumé indépendamment (ex. Neon + Fonction Vercel).
//
// (url.ts) adresses orchestrateur/relais ; (ops.ts) échange d'opérations P2P ;
// (payload.ts) agrégats légers ; (bless.ts) rattachement des écrans ; (background.ts) synchro
// d'arrière-plan ; (manual.ts) synchro manuelle et import du catalogue.
export { backgroundSync } from "./background";
export { importOwnerCatalog, syncNow, type ImportPhase } from "./manual";
export { runOpsExchange, SYNC_INTERVAL_MS } from "./ops";
export { getOpsRelayUrl, getOpsToken, getOrchestratorUrl } from "./url";
