// Tests des agrégats location (src/lib/analytics.ts) — fonctions pures,
// recalculables à la main, comme le reste des agrégations de l'application.
import { describe, it, expect } from "vitest";
import type { Rental } from "./db";
import { computeRentalStats } from "./analytics";

const HOUR = 3_600_000;
const DAY = 86_400_000;

const rental = (over: Partial<Rental> & { id: string }): Rental => ({
  asset_id: "asset",
  asset_name: "Actif",
  client_name: "",
  pricing_unit: "day",
  price_per_unit: 1000,
  quantity: 1,
  deposit: 0,
  start_date: 1_000_000 * DAY,
  expected_end_date: (1_000_000 + 2) * DAY,
  status: "returned",
  created_at: 0,
  updated_at: 0,
  ...over,
});

const FROM = 1_000_000 * DAY;
const TO = (1_000_000 + 14) * DAY;

describe("computeRentalStats", () => {
  it("facture prix unitaire × quantité × unités de temps arrondies au supérieur", () => {
    const stats = computeRentalStats(
      [
        rental({
          id: "r",
          pricing_unit: "hour",
          price_per_unit: 500,
          quantity: 3,
          expected_end_date: 1_000_000 * DAY + 3 * HOUR,
        }),
      ],
      FROM,
      TO,
    );
    expect(stats.rentalsCount).toBe(1);
    expect(stats.revenue).toBe(4500);
  });

  it("utilise la fin réelle quand le retour est tombé, la fin prévue sinon", () => {
    const returned = rental({
      id: "r1",
      expected_end_date: (1_000_000 + 4) * DAY,
      actual_end_date: (1_000_000 + 1) * DAY,
    });
    const active = rental({ id: "r2", status: "active", expected_end_date: (1_000_000 + 1) * DAY });
    expect(computeRentalStats([returned, active], FROM, TO).revenue).toBe(2000);
  });

  it("compte une location dans la période où elle commence, jamais hors fenêtre", () => {
    const inRange = rental({ id: "r1", start_date: FROM });
    const exactEnd = rental({ id: "r2", start_date: TO });
    const before = rental({ id: "r3", start_date: FROM - DAY });
    const stats = computeRentalStats([inRange, exactEnd, before], FROM, TO);
    expect(stats.rentalsCount).toBe(1);
  });

  it("ignore les locations annulées", () => {
    const cancelled = rental({ id: "r1", status: "cancelled" });
    const stats = computeRentalStats([cancelled], FROM, TO);
    expect(stats.rentalsCount).toBe(0);
    expect(stats.revenue).toBe(0);
  });

  it("agrège le revenu par actif, trié du plus rentable au moins rentable", () => {
    const rope = rental({ id: "r1", asset_id: "a1", asset_name: "Tente", price_per_unit: 3000 });
    const chair = rental({
      id: "r2",
      asset_id: "a2",
      asset_name: "Chaise",
      price_per_unit: 200,
      quantity: 10,
    });
    const stats = computeRentalStats(
      [rope, chair, rental({ id: "r3", asset_id: "a1", asset_name: "Tente" })],
      FROM,
      TO,
    );
    expect(stats.byAsset).toHaveLength(2);
    expect(stats.byAsset[0]).toEqual({
      asset_id: "a1",
      name: "Tente",
      rentalsCount: 2,
      revenue: 8000,
    });
    expect(stats.byAsset[1]).toEqual({
      asset_id: "a2",
      name: "Chaise",
      rentalsCount: 1,
      revenue: 4000,
    });
  });

  it("exprime la durée moyenne en heures si tout le parc est facturé à l'heure, en jours sinon", () => {
    const hourly = [
      rental({ id: "h1", pricing_unit: "hour", expected_end_date: 1_000_000 * DAY + 3 * HOUR }),
    ];
    const h = computeRentalStats(hourly, FROM, TO);
    expect(h.avgDurationUnit).toBe("heure");
    expect(h.avgDuration).toBe(3);

    const daily = [
      rental({ id: "d1", pricing_unit: "day", expected_end_date: (1_000_000 + 2) * DAY }),
    ];
    const d = computeRentalStats(daily, FROM, TO);
    expect(d.avgDurationUnit).toBe("jour");
    expect(d.avgDuration).toBe(2);
  });

  it("reste vide (zéro) sans aucune location dans la période", () => {
    const stats = computeRentalStats([], FROM, TO);
    expect(stats.rentalsCount).toBe(0);
    expect(stats.avgDuration).toBe(0);
    expect(stats.byAsset).toEqual([]);
  });
});
