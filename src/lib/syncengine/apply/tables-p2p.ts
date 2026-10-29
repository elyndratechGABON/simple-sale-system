import type { PosDatabase } from "../../db";
import type { Sale } from "@/lib/db";
import type { SyncOp, TableOpenedPayload } from "../types";
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
  if (existing && !existing.deleted_at) return; // fiche vivante : rien à faire
  const sale: Sale = {
    ...pl.sale,
    status: "open",
    ...touch(),
  };
  await db.sales.put(sale);
}
