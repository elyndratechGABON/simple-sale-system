import type { ClusterId } from "../../settings";
import type { SyncFields } from "./sync";

/**
 * Abonnement d'un client : formule payée périodiquement (abonnement de bar/salle de
 * sport, redevance mensuelle…). L'état affiché est DÉDUIT des dates et de `paid` :
 *  - "payé"    : le client a payé la période en cours ;
 *  - "en attente" : la période n'est pas réglée ;
 *  - "expiré"  : la date de fin est passée.
 * Ne rien stocker de plus — un statut calculé ne peut pas diverger de ses dates.
 */
export interface Subscription extends SyncFields {
  id: string;
  clientName: string;
  phone?: string;
  /** Formule : « Mensuel », « Trimestriel », « Annuel »… */
  plan: string;
  /** Montant de la période, en FCFA. */
  price: number;
  /** Début de la période, en millisecondes (début de journée). */
  startDate: number;
  /** Fin de la période, en millisecondes (début de journée). */
  endDate: number;
  paid: boolean;
}

/**
 * Registre clients du salon (cluster service). Fiche simple : nom, téléphone,
 * date de naissance (pour les anniversaires), et notes libres.
 * L'historique des visites se déduit des ventes liées via `client_id`.
 */
export interface Client extends SyncFields {
  id: string;
  name: string;
  phone?: string;
  /** Timestamp (début de journée) pour les rappels d'anniversaire. */
  birthday?: number;
  /** Notes libres (allergies, préférences, etc.). */
  notes?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

/**
 * Coût d'acquisition saisi manuellement pour un produit donné sur une période.
 * Un seul enregistrement par (product_id, period_from) : si l'utilisateur met
 * à jour le coût, on fait un upsert.
 *
 * Le bénéfice est calculé dans analytics.ts comme :
 *   profit = revenue - Σ(expenses.cost)
 */
export interface ProductExpense {
  id?: number;
  /** Identifiant du produit (clé catalogue). Pour les lignes libres (sans product_id),
   *  on utilise le nom du produit comme clé. */
  product_id: string;
  /** Début de période (timestamp jour, minuit local). */
  period_from: number;
  /** Fin de période (timestamp jour, exclusif). */
  period_to: number;
  /** Coût d'acquisition total saisi pour ce produit sur cette période. */
  cost: number;
}

/**
 * Bilan mensuel du calculateur de bénéfices (header). Un enregistrement par mois
 * (« YYYY-MM » local). Données LOCALES — comme `product_expenses`, jamais synchronisées :
 * un autre écran refait son propre bilan.
 */
export interface MonthlyOverview {
  /** Clé du mois : « YYYY-MM » (fuseau local). */
  id: string;
  /** Charges fixes du mois (loyer, eau, électricité…). 0 = non renseignées. */
  charges: number;
  /** Valeur du stock restant ajustée à la main ; `null` = estimation automatique. */
  stock_override: number | null;
  /** Complément de coût non suivi (achats dont le coût n'a jamais été renseigné). */
  cost_complement: number | null;
  updated_at: number;
}

/**
 * Journal des mouvements de stock : chaque variation de quantité laisse une trace
 * datée et motivée, pour répondre à « pourquoi il ne me reste que 3 Coca ? ».
 * `delta` est signé : +5 réapprovisionnement, −2 vente ou correction. Journal LOCAL —
 * le catalogue n'est pas synchronisé, un mouvement n'a pas plus à l'être.
 */
export interface StockMovement {
  id: string;
  product_id: string;
  /** Nom du produit au moment du mouvement (le catalogue peut renommer ensuite). */
  product_name: string;
  delta: number;
  reason: "replenishment" | "sale" | "round" | "cancellation" | "correction" | "creation";
  /** Prix d'achat unitaire saisi au réapprovisionnement. */
  unit_cost?: number;
  supplier?: string;
  note?: string;
  created_at: number;
}

/**
 * Trace d'une clôture de journée : le rapport figé au moment où on a tourné la clé.
 * `id` est la clé du jour (minuit local) — reclôturer le même jour REMPLACE la trace
 * au lieu d'en empiler une deuxième. Journal LOCAL : comme les mouvements de stock,
 * rien à synchroniser.
 */
export interface DayClosure {
  id: string;
  day: number;
  revenue: number;
  sales_count: number;
  closed_at: number;
}

/**
 * Carnet d'expérience employé — l'historique LOCAL des business où cette personne a
 * travaillé. Une entrée s'ouvre au rattachement (`SetupWizard` en mode « join ») et se
 * ferme à la suppression du compte employé (`closeEmployeeHistory`).
 *
 * Données de la PERSONNE, pas de la caisse : l'entrée est rattachée à un `employeeId`
 * stable (localStorage) qui SURVIT à `purgeAllData` et `resetDeviceIdentity` — un
 * employé qui quitte un business et en rejoint un autre retrouve ses expériences sur
 * l'écran « Mon expérience » du welcome.
 *
 * Local par nature : comme `product_expenses`, hors moteur de synchronisation.
 */
export interface EmployeeHistory {
  /** Clé déterministe : `${employeeId}|${shopId}|${startedAt}` (anti-doublon). */
  id: string;
  /** Identité stable de la personne (localStorage `elyndra_employee_id`). */
  employeeId: string;
  /** DeviceId au moment de l'expérience — change après `resetDeviceIdentity`. */
  deviceId: string;
  /** Groupe de partage P2P du business (`s_…`). */
  shopId: string;
  /** Enseigne du business, figée à l'ouverture. */
  storeName: string;
  /** Cluster métier du business (coiffeur, épicerie…). */
  cluster: ClusterId;
  role: "employee";
  /** Nom du vendeur s'il a été saisi (libellé). */
  employeeName?: string;
  /** Début de l'expérience, en ms. */
  startedAt: number;
  /** Fin de l'expérience, en ms. Absent = expérience en cours. */
  endedAt?: number;
  /** Durée en jours entiers ; posée à la fermeture. */
  durationDays: number;
}

/** Demande de catalogue en attente de confirmation du propriétaire.
 *  Créée quand un employé clique "Importer le stock du propriétaire".
 *  Le propriétaire doit confirmer pour que le snapshot soit envoyé. */
export interface CatalogueRequestPending {
  /** ID de l'op `catalogue.request` (ex: "dev_abc:5"). */
  id: string;
  /** Groupe de partage (`s_...`). */
  shop_id: string;
  /** Device ID de l'employé demandeur. */
  requester_id: string;
  /** État : pending | confirmed | denied | expired. */
  status: "pending" | "confirmed" | "denied" | "expired";
  created_at: number;
  confirmed_at?: number;
  denied_at?: number;
  /** Si le snapshot a été envoyé après confirmation. */
  snapshot_sent: boolean;
}
