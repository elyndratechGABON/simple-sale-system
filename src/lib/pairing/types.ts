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
  /** Identité et clé publique du propriétaire : épinglées par l'employé au scan du QR. */
  owner_device_id?: string;
  public_key?: string;
}

export type PairingShopInfo = Pick<PairingPayload, "name" | "phone" | "password"> & {
  pair_code?: string;
  shop?: Partial<PairingShopConfig>;
  role?: DeviceRole;
  /** Jeton de partage (QR v2) : réclamé au relais une fois le compte posé. Absent des QR v1. */
  token?: string;
  /** Adresse du relais PORTÉE PAR LE QR v3 (les champs proviennent du `meta` au redeem). */
  relay_url?: string;
  /** Clé de vérification du propriétaire, présente sur les QR nouvellement émis. */
  owner_device_id?: string;
  public_key?: string;
};

export interface SharePayload {
  v: 2;
  app: "ecaisse";
  url: string;
  token: string;
  name: string;
  account_phone: string;
  pair_code: string;
  /** Clé publique du propriétaire à épingler chez l'employé qui scanne ce QR. */
  owner_device_id?: string;
  public_key?: string;
  shop?: Partial<PairingShopConfig>;
  role?: DeviceRole;
}

/** QR v3 — ULTRA-LÉGER (mission appairage) : un QR dense se refuse au scan. Le code
 *  ne transporte que le jeton, le `shop_id` du groupe, le code de paire et l'adresse
 *  du relais. La copie de la boutique et la clé publique du principal vivent dans le
 *  `meta` du jeton (colonne du relais), rendues au redeem — l'échange de clés passe
 *  par le serveur, plus par le contenu du code. */
export interface ShareTokenPayload {
  v: 3;
  app: "ecaisse";
  /** Adresse du relais à réclamer (dérive de `getOpsRelayUrl`). */
  url: string;
  token: string;
  /** Groupe de partage (`s_…`) — le seul qui garantit la convergence. */
  shop_id: string;
  pair_code: string;
}
