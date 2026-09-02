// Paliers d'abonnement — source de vérité (module PUR, sans JSX).
//
// Miroir de PRICE_TIERS côté orchestrateur (10 000 F = 2 appareils · 25 000 F = 4 ·
// 50 000 F = 8, pour 30 jours chacun). Ne touchez pas un prix sans l'orchestrateur.
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
    devices: 2,
    features: [
      "2 caisses simultanées",
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
    devices: 4,
    features: [
      "4 caisses simultanées",
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
    devices: 8,
    features: [
      "8 caisses simultanées",
      "Tout du palier Confort",
      "Idéal bars & restaurants animés",
      "Support téléphonique dédié",
    ],
  },
];
