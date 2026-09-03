// Paliers d'abonnement — source de vérité (module PUR, sans JSX).
//
// Miroir de PRICE_TIERS côté orchestrateur (10 000 F = 3 écrans · 25 000 F = 5 ·
// 50 000 F = 9, pour 30 jours chacun). Le nombre d'écrans inclut TOUJOURS la caisse
// du propriétaire (+1) : « 3 écrans » = propriétaire + 2 employés/gérants.
//
// IMPORTANT : l'orchestrateur (dépôt séparé, simple-sale-orchestrator) doit renvoyer
// les mêmes max_devices (3/5/9) à la place du compte, sinon l'indicateur « Places
// utilisées » des réglages — alimenté par le handshake serveur — restera à 2/4/8.
// Ne touchez pas un prix sans l'orchestrateur.
export interface PlanInfo {
  id: "essentiel" | "confort" | "affluence";
  name: string;
  price: number;
  /** Durée couverte par le palier, en jours (miroir du serveur : 30 j par palier). */
  period: string;
  /** Nombre d'appareils (caisses) autorisés simultanément sur le compte. */
  devices: number;
  features: string[];
  isPopular?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: 10_000,
    period: "30 jours",
    devices: 3,
    features: [
      "3 caisses simultanées",
      "Accès complet à la caisse",
      "Export PDF / Excel / CSV",
      "Support WhatsApp",
    ],
  },
  {
    id: "confort",
    name: "Confort",
    price: 25_000,
    period: "30 jours",
    devices: 5,
    features: [
      "5 caisses simultanées",
      "Tout du palier Essentiel",
      "Rapports multi-boutiques",
      "Support WhatsApp prioritaire",
    ],
    isPopular: true,
  },
  {
    id: "affluence",
    name: "Affluence",
    price: 50_000,
    period: "30 jours",
    devices: 9,
    features: [
      "9 caisses simultanées",
      "Tout du palier Confort",
      "Idéal bars & restaurants animés",
      "Support téléphonique dédié",
    ],
  },
];
