import { describe, expect, it } from "vitest";
import { monthGrid } from "./calendar-days";

describe("monthGrid", () => {
  it("retourne toujours 42 cellules, dont la première tombe un lundi", () => {
    const grid = monthGrid(2026, 9); // octobre 2026 : 31 jours, commence un jeudi
    expect(grid).toHaveLength(42);
    expect(new Date(grid[0].ts).getDay()).toBe(1);
  });

  it("couvre exactement les jours du mois demandé (février bissextile)", () => {
    const grid = monthGrid(2024, 1); // février 2024 : 29 jours, commence un jeudi
    const inMonth = grid.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(29);
    expect(inMonth[0].ts).toBe(new Date(2024, 1, 1).getTime());
    expect(new Date(inMonth[inMonth.length - 1].ts).getDate()).toBe(29);
  });
});
