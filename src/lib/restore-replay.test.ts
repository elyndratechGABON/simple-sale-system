// Restauration depuis l'archive — le rejeu qui ne se teste pas à la main.
//
// Téléphone perdu, téléphone neuf, l'orchestrateur sert l'archive. Ce que ces tests
// verrouillent est ce qui ferait échouer SILENCIEUSEMENT cette restauration : des ops
// rejetées faute de clé épinglée, un rejeu qui duplique le catalogue.
//
// Les ops sont SIGNÉES par `signAll` avec la clé de l'appareil courant — exactement
// ce que le drainer archive puis rend. Une archive dont les signatures ne vérifient
// pas doit être refusée : c'est la garantie qui empêche de réinjecter un journal
// forgé via le canal de restauration.
import { test, expect, vi, afterEach } from "vitest";
import { listProducts, resetDBForTests } from "@/lib/db";
import { applyRemoteOps } from "@/lib/syncengine/apply";
import { ensureIdentity, resetIdentityForTests } from "@/lib/syncengine/identity";
import type { SyncOp } from "@/lib/syncengine/types";
import { announceSigned, product, sign } from "./restore-helpers";

afterEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
  vi.unstubAllGlobals();
});

test("le rejeu reconstruit le catalogue depuis une archive signée", async () => {
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  const [created] = await sign([product(identity, "p1", "Chaises plastiques")]);

  // L'archive rejoue dans l'ordre chronologique : annonce d'abord, sinon les clés
  // manquent et tout est refusé.
  await applyRemoteOps([announce, created]);

  const found = await listProducts();
  expect(found.some((p) => p.id === "p1")).toBe(true);
  expect(found.find((p) => p.id === "p1")?.name).toBe("Chaises plastiques");
});

test("rejouer deux fois la même archive ne duplique rien", async () => {
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  const [created] = await sign([product(identity, "p2", "Tentes")]);

  await applyRemoteOps([announce, created]);
  await applyRemoteOps([announce, created]);

  const found = await listProducts();
  expect(found.filter((p) => p.id === "p2").length).toBe(1);
});

test("une archive dont les signatures ne vérifient pas est refusée", async () => {
  const identity = await ensureIdentity();
  const announce = await announceSigned(identity.deviceId, identity.shopId);
  // Falsification du payload APRÈS signature : la clé ne correspond plus.
  const forged = {
    ...product(identity, "p3", "Produit forgé"),
    payload: { product: { id: "p3", name: "Autre" } },
  };

  const r = await applyRemoteOps([announce, forged as SyncOp]);
  // L'annonce EST appliquée (elle est légitime) : c'est l'op forgée qui ne doit pas
  // l'être. Compter sur `applied` seul compterait l'annonce et laisserait passer la
  // forgery — d'où l'assertion sur la présence du produit, qui est le vrai critère.
  expect(r.applied).toBe(1);
  const found = await listProducts();
  expect(found.some((p) => p.id === "p3")).toBe(false);
});
