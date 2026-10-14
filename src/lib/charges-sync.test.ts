// Les charges traversent le canal P2P. Ce que ces tests verrouillent est précisément le
// piège que la première version du handler contenait : une garde `!existing` copiée sur
// `applyProductUpdated`, correcte parce qu'un `product.created` a déjà posé la ligne.
//
// Les charges n'ont qu'un seul op (`charge.saved`) : la garde aurait fait que le montant
// du LOYER saisi par le patron sur sa caisse n'arrive jamais sur l'écran de l'employé —
// sans le moindre message, la charge disparue n'apparaîtrait que dans le total du bénéfice.

import { test, expect, afterEach } from "vitest";
import { listCharges, resetDBForTests } from "@/lib/db";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { ensureIdentity, resetIdentityForTests } from "@/lib/syncengine/identity";
import type { ChargeSavedPayload } from "@/lib/syncengine/types";
import { announceSigned, archived, sign } from "./restore-helpers";

const JOUR = 24 * 60 * 60 * 1000;
const MOIS_START = new Date(2026, 9, 1).getTime();
const MOIS_END = new Date(2026, 10, 1).getTime();

const LOYER: ChargeSavedPayload["fields"] = {
  kind: "business",
  label: "Loyer",
  period_start: MOIS_START,
  period_to: MOIS_END,
  amount: 150_000,
};

afterEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
});

test("une charge saisie ailleurs se POSE chez le pair qui n'en a jamais eu", async () => {
  const identity = await ensureIdentity();
  await applyRemoteOps([await announceSigned(identity.deviceId, identity.shopId)]);

  const [saved] = await sign([
    archived(
      identity,
      "charge:2",
      "charge.saved",
      "c-loyer",
      { charge_id: "c-loyer", fields: LOYER } satisfies ChargeSavedPayload,
      1000,
    ),
  ]);

  const { applied } = await applyRemoteOps([saved]);
  expect(applied).toBe(1);

  const charges = await listCharges(MOIS_START, MOIS_END);
  expect(charges).toHaveLength(1);
  expect(charges[0].label).toBe("Loyer");
  expect(charges[0].amount).toBe(150_000);
});

test("réécrire la même charge met à jour au lieu de dupliquer", async () => {
  const identity = await ensureIdentity();
  await applyRemoteOps([await announceSigned(identity.deviceId, identity.shopId)]);

  const [cree] = await sign([
    archived(identity, "c1:2", "charge.saved", "c1", { charge_id: "c1", fields: LOYER }, 1000),
  ]);
  await applyRemoteOps([cree]);

  const [reprise] = await sign([
    archived(
      identity,
      "c1:3",
      "charge.saved",
      "c1",
      { charge_id: "c1", fields: { ...LOYER, amount: 180_000 } },
      2000,
    ),
  ]);
  await applyRemoteOps([reprise]);

  const charges = await listCharges(MOIS_START, MOIS_END);
  expect(charges).toHaveLength(1);
  expect(charges[0].amount).toBe(180_000);
});

test("une charge supprimée disparaît des totaux, sans être effacée", async () => {
  const identity = await ensureIdentity();
  await applyRemoteOps([await announceSigned(identity.deviceId, identity.shopId)]);

  const [cree] = await sign([
    archived(identity, "c2:2", "charge.saved", "c2", { charge_id: "c2", fields: LOYER }, 1000),
  ]);
  await applyRemoteOps([cree]);
  const [supprimee] = await sign([
    archived(identity, "c2:3", "charge.deleted", "c2", { charge_id: "c2" }, 2000),
  ]);
  await applyRemoteOps([supprimee]);

  expect(await listCharges(MOIS_START, MOIS_END)).toHaveLength(0);

  // Le pair n'a pas non plus le droit de la ressusciter en la réémettant telle quelle.
  const [reecrite] = await sign([
    archived(identity, "c2:4", "charge.saved", "c2", { charge_id: "c2", fields: LOYER }, 3000),
  ]);
  await applyRemoteOps([reecrite]);
  expect(await listCharges(MOIS_START, MOIS_END)).toHaveLength(0);
});

test("rejouer la même op ne fait rien une seconde fois", async () => {
  const identity = await ensureIdentity();
  await applyRemoteOps([await announceSigned(identity.deviceId, identity.shopId)]);

  const [saved] = await sign([
    archived(identity, "c3:2", "charge.saved", "c3", { charge_id: "c3", fields: LOYER }, 1000),
  ]);

  const premier = await applyRemoteOps([saved]);
  const second = await applyRemoteOps([saved]);

  expect(premier.applied).toBe(1);
  expect(second.applied).toBe(0);
  expect(second.skipped).toBe(1);
  expect(await listCharges(MOIS_START, MOIS_END)).toHaveLength(1);
});

test("une charge ne se déduit pas du chevauchement de période", async () => {
  // Un loyer du 1er au 31 doit apparaître dans la consultation de la dernière semaine —
  // c'est tout l'intérêt de `listCharges` plutôt qu'un `between(period_start)`.
  expect(await listCharges(MOIS_START, MOIS_END)).toHaveLength(0);

  const identity = await ensureIdentity();
  await applyRemoteOps([await announceSigned(identity.deviceId, identity.shopId)]);
  const [saved] = await sign([
    archived(identity, "c4:2", "charge.saved", "c4", { charge_id: "c4", fields: LOYER }, 1000),
  ]);
  await applyRemoteOps([saved]);

  const derniereSemaine = await listCharges(MOIS_END - 7 * JOUR, MOIS_END);
  expect(derniereSemaine).toHaveLength(1);
});
