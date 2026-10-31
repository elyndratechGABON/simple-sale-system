import type { DeviceRole } from "./identity";

/** Décision du propriétaire : ce qu'il partage avec UN écran. */
export type ShareMode = "all" | "selection";

/** Registre local des appareils connus du même compte (post-pairing). */
export interface PairedDevice {
  id: string;
  /** Groupe de partage auquel appartient le pair. */
  shop_id: string;
  device_name?: string;
  /** `all` = tout le catalogue ; `selection` = une liste de produits. Absent = `all`
   *  (les pairs enregistrés avant l'introduction du choix se comportent comme avant). */
  share_mode?: ShareMode;
  /** Produits retenus quand `share_mode === "selection"`. */
  shared_product_ids?: string[];
  /** Empreinte du sous-catalogue déjà publié pour ce pair : évite de renvoyer le même
   *  stock à chaque cycle. Mémorisée seulement après un push réussi. */
  shared_signature?: string;
  /** Dernière publication pour ce pair — la fenêtre anti-spam vit ICI, pas en mémoire :
   *  un redémarrage de l'application ne doit pas redéclencher une rafale d'instantanés. */
  shared_published_at?: number;
  /** Numéro déclaré par l'écrans (`device.announce`) : sert au patron à joindre la
   *  bonne personne dans « Activité du personnel ». Facultatif — un écran qui ne l'a
   *  pas déclaré n'affiche aucun numéro, jamais un numéro deviné. */
  phone?: string;
  role?: DeviceRole;
  public_key?: string;
  last_seen?: number;
  /** `paired` dès que l'appairage compte tenu du code ou d'une approbation ; `pending` sinon.
   *  `revoked` = pochette funéraire (tombstone) : l'écran a été licencié — sa fiche reste
   *  au registre pour S'OPPOSER à sa résurrection par une re-annonce, mais n'apparaît
   *  plus nulle part. */
  status?: "pending" | "paired" | "revoked";
  /** Horodatage du licenciement. Posé par `device.leave` (côté et tiré), jamais effacé. */
  revoked_at?: number;
  /** Horodatage du moment où l'appareil est devenu `paired`. Stable une fois posé. */
  paired_at?: number;
  /** `device_id` serveur (fiche boutique) de l'appareil : la cible exacte du `bless` qui
   *  rattache l'écran au compte marchand. Transporté par l'annonce, pas dérivable. */
  server_device_id?: string;
  /** Posé quand l'écran a été rattaché au compte côté orchestrateur (`/account/bless`). */
  blessed_at?: number;
  updated_at: number;
}
