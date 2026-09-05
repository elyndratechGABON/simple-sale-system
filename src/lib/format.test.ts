import { describe, it, expect } from "vitest";
import { formatExperienceDuration } from "./format";

describe("formatExperienceDuration", () => {
  it("renders sub-day stints", () => {
    expect(formatExperienceDuration(0)).toBe("moins d'un jour");
    expect(formatExperienceDuration(-3)).toBe("moins d'un jour");
    expect(formatExperienceDuration(Number.NaN)).toBe("moins d'un jour");
  });

  it("renders days", () => {
    expect(formatExperienceDuration(1)).toBe("1 jour");
    expect(formatExperienceDuration(2)).toBe("2 jours");
    expect(formatExperienceDuration(29)).toBe("29 jours");
  });

  it("renders months (30-day convention)", () => {
    expect(formatExperienceDuration(30)).toBe("1 mois");
    expect(formatExperienceDuration(60)).toBe("2 mois");
    expect(formatExperienceDuration(45)).toBe("1 mois et 15 j");
  });

  it("renders years (365-day convention)", () => {
    expect(formatExperienceDuration(365)).toBe("1 an");
    expect(formatExperienceDuration(730)).toBe("2 ans");
    expect(formatExperienceDuration(400)).toBe("1 an et 1 mois");
  });
});
