import { describe, expect, it } from "vitest";
import { controlWeight, pawnBulk, pawnCap, rangeOfControl } from "./progression.js";

describe("pawnCap (DESIGN.md §8.1)", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [20, 5],
  ])("at level %i the cap is %i", (level, expected) => {
    expect(pawnCap(level)).toBe(expected);
  });
});

describe("controlWeight", () => {
  it("Small and Medium pawns count as 1", () => {
    expect(controlWeight({ size: "sm" })).toBe(1);
    expect(controlWeight({ size: "med" })).toBe(1);
  });

  it("Large pawns count as 2", () => {
    expect(controlWeight({ size: "lg" })).toBe(2);
  });
});

describe("rangeOfControl (DESIGN.md §8.1)", () => {
  it("is 30 ft with neither feat", () => {
    expect(rangeOfControl({})).toBe(30);
  });

  it("is 60 ft with Expanded Control", () => {
    expect(rangeOfControl({ expandedControl: true })).toBe(60);
  });

  it("is 90 ft with both Expanded and Superior Control", () => {
    expect(rangeOfControl({ expandedControl: true, superiorControl: true })).toBe(90);
  });
});

describe("pawnBulk", () => {
  it("Small is 1, Medium is 2, Large is 6", () => {
    expect(pawnBulk({ size: "sm" })).toBe(1);
    expect(pawnBulk({ size: "med" })).toBe(2);
    expect(pawnBulk({ size: "lg" })).toBe(6);
  });
});
