import { describe, expect, it } from "vitest";
import { buildFeatureLinkRules } from "./feature-map.js";

describe("buildFeatureLinkRules", () => {
  it("adds nothing without Tactical Opportunist", () => {
    expect(buildFeatureLinkRules({ featureSlugs: ["evasion"] })).toEqual([]);
    expect(buildFeatureLinkRules({})).toEqual([]);
  });

  it("gives pawn Strikes the backstabber trait when the maestro has Tactical Opportunist", () => {
    const rules = buildFeatureLinkRules({ featureSlugs: ["tactical-opportunist"] });
    expect(rules).toContainEqual({ key: "AdjustStrike", property: "traits", mode: "add", value: "backstabber" });
  });
});
