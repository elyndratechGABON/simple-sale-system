import { test, expect } from "vitest";
import type { Charge } from "@/lib/db";
import { groupChargesByKind } from "./charges-by-period";

const charge = (over: Partial<Charge> = {}): Charge => ({
  id: "c1",
  kind: "service",
  category: "Plats",
  period_start: 1,
  period_to: 2,
  amount: 10_000,
  updated_at: 1,
  sync_status: "local",
  ...over,
});

test("les charges se séparent par nature", () => {
  const { services, business } = groupChargesByKind([
    charge({ id: "s1", kind: "service", category: "Plats", amount: 10_000 }),
    charge({ id: "b1", kind: "business", category: undefined, label: "Loyer", amount: 20_000 }),
  ]);

  expect(services).toEqual([{ id: "s1", category: "Plats", amount: 10_000 }]);
  expect(business).toEqual([{ id: "b1", label: "Loyer", amount: 20_000 }]);
});

test("chaque groupe est trié par montant décroissant", () => {
  const { services, business } = groupChargesByKind([
    charge({ id: "s1", category: "Plats", amount: 5_000 }),
    charge({ id: "s2", category: "Desserts", amount: 30_000 }),
    charge({ id: "b1", kind: "business", label: "Eau", amount: 1_000 }),
    charge({ id: "b2", kind: "business", label: "Loyer", amount: 50_000 }),
  ]);

  expect(services.map((s) => s.category)).toEqual(["Desserts", "Plats"]);
  expect(business.map((b) => b.label)).toEqual(["Loyer", "Eau"]);
});

test("aucune charge donne deux groupes vides", () => {
  expect(groupChargesByKind([])).toEqual({ services: [], business: [] });
});

test("deux charges de même catégorie restent DEUX lignes", () => {
  // PAS de fusion : additionner afficherait le double du montant réel si le commerçant a
  // saisi deux fois (cf. le doublon se traite à l'écriture, on réécrit l'existante). Et
  // surtout, une ligne doit correspondre à UN enregistrement, sinon « supprimer » ne sait
  // pas quoi supprimer.
  const { services } = groupChargesByKind([
    charge({ id: "s1", category: "Plats", amount: 15_000 }),
    charge({ id: "s2", category: "Plats", amount: 15_000 }),
  ]);

  expect(services).toHaveLength(2);
  expect(services.map((s) => s.id)).toEqual(["s1", "s2"]);
});

test("une charge service sans catégorie est ignorée", () => {
  // `Charge.category` est facultatif dans le type : la saisie ne l'impose pas. Sans
  // catégorie, la ligne n'a pas de place dans un formulaire.
  const { services, business } = groupChargesByKind([
    charge({ id: "s1", category: undefined }),
    charge({ id: "b1", kind: "business", label: undefined }),
  ]);

  expect(services).toEqual([]);
  expect(business).toEqual([]);
});
