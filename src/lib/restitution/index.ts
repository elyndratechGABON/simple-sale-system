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
//
// (types.ts) formes des payloads ; (request.ts) QR de restitution ;
// (closing.ts) agrégats et QR de clôture ; (import.ts) import côté propriétaire.
export { applyClosingImport } from "./import";
export { buildClosingPayload, parseClosingPayload } from "./closing";
export { buildRestitutionRequest, parseRestitutionRequest } from "./request";
export type {
  ClosingCategory,
  ClosingImportResult,
  ClosingPayload,
  ClosingProduct,
  RestitutionRequest,
} from "./types";
