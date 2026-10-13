import type { ClusterId } from "@/lib/settings";
import type { DeviceRole } from "@/lib/syncengine/types";

/** Configuration métier de la boutique (le « type de boutique » de l'onboarding).
 *  Copiée telle quelle d'une fiche à l'autre : la nouvelle caisse s'ouvre identique à
 *  la boutique scannée (secteur, tables, unités, domaine personnalisé…). */
export interface PairingShopConfig {
  /** Profil métier : restaurant, bar, service, personnalise… */
  cluster: ClusterId;
  /** Domaine d'activité libre saisi pour le cluster Personnalisé. */
  customDomain: string;
  /** Stock au kilo ou à l'unité (cluster Personnalisé). */
  customUnitType?: "unit" | "weight";
  /** Système de tables activé ou non (commande puis encaissement). */
  tablesEnabled: boolean;
  /** Identité de la boutique. */
  storeName: string;
  ownerName: string;
  phone: string;
  quarter: string;
}

export interface PairingPayload {
  v: 1;
  app: "ecaisse";
  /** URL de l'orchestrateur — la nouvelle caisse doit parler au même serveur. */
  url: string;
  name: string;
  phone: string;
  password: string;
  /** Code de confirmation TEMPORAIRE (code de paire P2P, valable 10 min) affiché par
   *  le principal au moment de fabriquer le QR. Le téléphone qui scanne s'annonce avec
   *  cette preuve : le principal le reconnaît `paired` d'office et les données
   *  (produits, ventes, stock) convergent au prochain échange P2P. Optionnel — absent
   *  quand aucun code n'est actif, le scan fonctionne quand même (copie boutique). */
  pair_code?: string;
  /** Copie de la boutique scannée (v1.1) : identité + type de boutique. Champs
   *  optionnels pour rester lisibles par les anciennes versions de parsePairingPayload. */
  shop?: Partial<PairingShopConfig>;
  /** Rôle assigné par le propriétaire au moment du partage (employé).
   *  Optionnel : absent dans les QR générés avant cette fonctionnalité. */
  role?: DeviceRole;
}

export type PairingShopInfo = Pick<PairingPayload, "name" | "phone" | "password"> & {
  pair_code?: string;
  shop?: Partial<PairingShopConfig>;
  role?: DeviceRole;
  /** Jeton de partage (QR v2) : réclamé au relais une fois le compte posé. Absent des QR v1. */
  token?: string;
};

export interface SharePayload {
  v: 2;
  app: "ecaisse";
  url: string;
  token: string;
  name: string;
  account_phone: string;
  pair_code: string;
  shop?: Partial<PairingShopConfig>;
  role?: DeviceRole;
}
