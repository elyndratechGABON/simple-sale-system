import type { PosDatabase } from "../../db";
import type { Sale } from "@/lib/db";
import type { SyncOp, TableOpenedPayload, TableUpdatedPayload } from "../types";
import { touch } from "./helpers";

/**
 * Miroir P2P d'une table OUVERTE : le pair crée LOCALEMENT la `Sale` (statut "open",
 * sans lignes) pour que son plan de salle affiche l'addition — deux serveurs ne
 * peuvent plus viser la même table sans le savoir.
 *
 * Pourquoi réutiliser la `Sale` (et non un marqueur séparé) : le floor-plan
 * (`listOpenTables`) est déjà assemblé depuis `sales` au statut "open", et un
 * encaissement LÀ-BAS peut passer par le même rejeu de `payTable` que le local.
 *
 * Idempotence : `applyOp` cote déjà l'op (`processed_ops`), et la cible est gardée :
 * ré-ouvrir une table dont la fiche existante就行了 vivante est ignoré (pas d'écrasement
 * d'un total déjà cumulé chez le pair).
 *
 * Réception par un PAIR SALARIÉ : identique — le stock n'est pas décrémenté ici
 * (l'émetteur l'a déjà fait à la commande), les lignes ne vivent que chez l'émetteur,
 * au paiement l'op `sale.created` de l'émetteur transporte les lignes complètes.
 */
export async function applyTableOpened(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as TableOpenedPayload;
  if (!pl?.label || !pl?.sale?.id) return;
  const existing = await db.sales.get(pl.sale.id);
  if (existing && !existing.deleted_at) {
    // Fiche vivante : le total cumulé chez le pair n'est pas écrasé, mais QUI
    // sert la table est rafraîchi (l'op peut venir d'un second écran de l'équipe).
    if (pl.employee_name && pl.employee_name !== existing.employee_name) {
      await db.sales.put({ ...existing, employee_name: pl.employee_name, ...touch() });
    }
    return;
  }
  const sale: Sale = {
    ...pl.sale,
    status: "open",
    ...(pl.employee_name ? { employee_name: pl.employee_name } : {}),
    ...touch(),
  };
  await db.sales.put(sale);
}

/**
 * Miroir P2P d'un ÉTAT de table : tournée ajoutée ou encaissée. Les lignes ne
 * vivent que chez l'émetteur — le pair ne reçoit que le MONTANT en cours et
 * QUI le sert : son plan de salle affiche l'addition à jour en temps réel.
 */
export async function applyTableUpdated(db: PosDatabase, op: SyncOp): Promise<void> {
  const pl = op.payload as TableUpdatedPayload;
  if (!pl?.sale?.id) return;
  const existing = await db.sales.get(pl.sale.id);
  if (!existing || existing.deleted_at) {
    // Table encore inconnue ici (l'op `table.opened` peut être plus loin
    // dans la file) : créer la fiche ouverte directement à l'état reçu.
    if (existing?.deleted_at) return;
    const sale: Sale = {
      ...pl.sale,
      status: "open",
      ...(pl.employee_name ? { employee_name: pl.employee_name } : {}),
      ...touch(),
    };
    await db.sales.put(sale);
    return;
  }
  if (existing.status !== "open") return; // déjà réglée : ne pas régresser
  const updated: Sale = {
    ...existing,
    total: pl.sale.total ?? existing.total,
    ...(pl.employee_name ? { employee_name: pl.employee_name } : {}),
    ...touch(),
  };
  await db.sales.put(updated);
}
