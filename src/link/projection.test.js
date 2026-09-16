import { describe, expect, it } from "vitest";
import { buildLinkItemRules, buildPawnUpdate, rulesEqual } from "./projection.js";

describe("buildPawnUpdate", () => {
  it("writes the level and all six ability modifiers", () => {
    const update = buildPawnUpdate({
      level: 5,
      abilities: { str: 2, dex: 2, con: 2, int: 4, wis: 1, cha: 0 },
    });
    expect(update).toEqual({
      "system.details.level.value": 5,
      "system.abilities.str.mod": 2,
      "system.abilities.dex.mod": 2,
      "system.abilities.con.mod": 2,
      "system.abilities.int.mod": 4,
      "system.abilities.wis.mod": 1,
      "system.abilities.cha.mod": 0,
    });
  });
});

describe("buildLinkItemRules", () => {
  it("the base case has only the AC modifier, its Dex cap, and the ability attack modifier", () => {
    const rules = buildLinkItemRules({ intMod: 4 });
    expect(rules).toEqual([
      { key: "FlatModifier", selector: "ac", type: "item", value: 4 },
      { key: "DexterityModifierCap", value: 0 },
      { key: "FlatModifier", selector: "strike-attack-roll", type: "ability", ability: "int" },
    ]);
  });

  it("includes armor potency and the Metal +1 in the AC modifier", () => {
    const rules = buildLinkItemRules({ intMod: 4, armorPotency: 3, metal: true });
    expect(rules[0]).toEqual({ key: "FlatModifier", selector: "ac", type: "item", value: 8 });
  });

  it("omits the resilient save modifier when there's no resilient rune", () => {
    const rules = buildLinkItemRules({ intMod: 4 });
    expect(rules.some((r) => r.selector === "saving-throw")).toBe(false);
  });

  it("adds a resilient save modifier when resilientRank > 0", () => {
    const rules = buildLinkItemRules({ intMod: 4, resilientRank: 2 });
    expect(rules).toContainEqual({ key: "FlatModifier", selector: "saving-throw", type: "item", value: 2 });
  });

  it("upgrades skill rank and adds an item bonus only when each is present", () => {
    const rules = buildLinkItemRules({
      intMod: 4,
      skills: [
        { slug: "arcana", rank: 1, itemBonus: 0 },
        { slug: "stealth", rank: 2, itemBonus: 1 },
      ],
    });
    expect(rules).toContainEqual({ key: "ActiveEffectLike", mode: "upgrade", path: "system.skills.arcana.rank", value: 1 });
    expect(rules.some((r) => r.selector === "arcana")).toBe(false);
    expect(rules).toContainEqual({ key: "ActiveEffectLike", mode: "upgrade", path: "system.skills.stealth.rank", value: 2 });
    expect(rules).toContainEqual({ key: "FlatModifier", selector: "stealth", type: "item", value: 1 });
  });

  it("adds weapon rune rule elements only when present", () => {
    const rules = buildLinkItemRules({
      intMod: 4,
      weaponPotency: 2,
      strikingRank: 1,
      propertyRunes: ["flaming"],
    });
    expect(rules).toContainEqual({ key: "WeaponPotency", value: 2 });
    expect(rules).toContainEqual({ key: "Striking", value: 1 });
    expect(rules).toContainEqual({ key: "AdjustStrike", property: "property-runes", mode: "add", value: "flaming" });
  });

  it("Small pawns get no CreatureSize rule", () => {
    const rules = buildLinkItemRules({ intMod: 4, size: "sm" });
    expect(rules.some((r) => r.key === "CreatureSize")).toBe(false);
  });

  it("Medium pawns get CreatureSize but not the Large-only rules", () => {
    const rules = buildLinkItemRules({ intMod: 4, size: "med" });
    expect(rules).toContainEqual({ key: "CreatureSize", value: "med" });
    expect(rules.some((r) => r.selector === "hp-per-level")).toBe(false);
  });

  it("Large pawns get CreatureSize, the hp-per-level modifier, and +5 reach", () => {
    const rules = buildLinkItemRules({ intMod: 4, size: "lg" });
    expect(rules).toContainEqual({ key: "CreatureSize", value: "lg" });
    expect(rules).toContainEqual({ key: "FlatModifier", selector: "hp-per-level", type: "untyped", value: 2 });
    expect(rules).toContainEqual({ key: "ActiveEffectLike", mode: "add", path: "system.attributes.reach.base", value: 5 });
  });
});

describe("rulesEqual (idempotency)", () => {
  it("is true for the same snapshot computed twice", () => {
    const a = buildLinkItemRules({ intMod: 4, size: "lg" });
    const b = buildLinkItemRules({ intMod: 4, size: "lg" });
    expect(rulesEqual(a, b)).toBe(true);
  });

  it("is false once the snapshot changes", () => {
    const a = buildLinkItemRules({ intMod: 4 });
    const b = buildLinkItemRules({ intMod: 5 });
    expect(rulesEqual(a, b)).toBe(false);
  });
});
