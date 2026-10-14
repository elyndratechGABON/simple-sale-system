// Charges de service et charges d'exploitation, par période.
//
// Une charge est une SAISIE, pas un calcul : contrairement à `ProductExpense` et
// `MonthlyOverview` (locaux, reconstruis par chaque écran), elle est synchronisée. Le
// patron saisit « Loyer » sur sa caisse, l'autre poste doit l'afficher — sinon le
// bénéfice affiché dépend de la machine qui regarde.
//
// ÉMISSION : chaque écriture émet son op DANS la transaction qui porte l'enregistrement
// (cf. `ops.ts` — l'op et l'écriture métier ne doivent jamais se séparer). `db.settings`
// entre dans la transaction parce que `emitOp` y incrémente le compteur `SEQUENCE_KEY`.

import { emitOp } from "../syncengine/ops";
import { ensureIdentity, getIdentity } from "../syncengine/identity";
import type { ChargeSavedPayload } from "../syncengine/types";
import { alive, getDB, touch, uid } from "./internal";
import type { Charge } from "./types/records";
import type { SyncFields } from "./types/sync";

/** Ce que l'écran saisit : les champs métier, l'id optionnel. */
export type ChargeInput = Omit<Charge, "id" | keyof SyncFields> & { id?: string };

/**
 * Crée ou met à jour une charge, puis émet `charge.saved`.
 *
 * L'op ne porte QUE les champs métier : un pair ne peut donc pas forger un `deleted_at`
 * (ressusciter une charge effacée) ni un `sync_status`, pas plus qu'un `product.updated`.
 *
 * Ne réanime JAMAIS une charge supprimée localement : l'id est unique et non réutilisé,
 * donc la réécrire ferait réapparaître une ligne que le commerçant a retirée.
 */
export async function saveCharge(input: ChargeInput): Promise<string> {
  await ensureIdentity();
  const db = getDB();
  const id = input.id ?? uid();
  await db.transaction("rw", db.charges, db.sync_ops, db.settings, async () => {
    const existing = await db.charges.get(id);
    if (existing?.deleted_at) return;
    await db.charges.put({ ...existing, ...input, id, ...touch() });
    const fields: ChargeSavedPayload["fields"] = {
      kind: input.kind,
      category: input.category,
      label: input.label,
      period_start: input.period_start,
      period_to: input.period_to,
      amount: input.amount,
    };
    await emitOp(db, getIdentity(), {
      type: "charge.saved",
      entity_id: id,
      payload: { charge_id: id, fields },
    });
  });
  return id;
}

/** Suppression LOGIQUE (cf. AGENTS.md) : `deleted_at` + op `charge.deleted`. */
export async function deleteCharge(id: string): Promise<void> {
  await ensureIdentity();
  const db = getDB();
  const existing = await db.charges.get(id);
  if (!existing || existing.deleted_at) return;
  await db.transaction("rw", db.charges, db.sync_ops, db.settings, async () => {
    await db.charges.put({ ...existing, ...touch(), deleted_at: Date.now() });
    await emitOp(db, getIdentity(), {
      type: "charge.deleted",
      entity_id: id,
      payload: { charge_id: id },
    });
  });
}

/**
 * Charges qui CHEVAUCHENT la fenêtre [from, to] — pas seulement celles qui commencent
 * dedans : un loyer mensuel court jusqu'au bout du mois quand on consulte une semaine.
 *
 * Filtre en mémoire sur les lignes VIVANTES : le volume est celui d'une boutique (quelques
 * dizaines de lignes, une par poste et par mois), et un `where("period_start").between()`
 * manquerait les charges longues. `alive()` est obligatoire — une charge supprimée ne
 * doit jamais revenir dans un total.
 */
export async function listCharges(from: number, to: number): Promise<Charge[]> {
  const db = getDB();
  const rows = alive(await db.charges.toArray());
  return rows
    .filter((c) => c.period_start < to && c.period_to > from)
    .sort((a, b) => a.period_start - b.period_start);
}
