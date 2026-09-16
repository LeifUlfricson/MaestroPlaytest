import { describe, expect, it } from "vitest";
import {
  maestroClassDC,
  pawnAbilityMods,
  pawnAC,
  pawnMaxHP,
  pawnPerception,
  pawnSaves,
  pawnSpeed,
  pawnUnarmedAttack,
  stoneResistance,
} from "./pawn-stats.js";

/** Builds the full worked-example row (DESIGN.md §2.3) for a Small, non-Flesh pawn. */
function fixture({ level, intMod, wisMod, armorPotency = 0, manualMight = false, size = "sm" }) {
  const abilities = pawnAbilityMods({ intMod, wisMod, manualMight, size });
  return {
    abilities,
    hp: pawnMaxHP({ level, conMod: abilities.con }),
    ac: pawnAC({ level, dexMod: abilities.dex, intMod: abilities.int, armorPotency }),
    unarmedAttack: pawnUnarmedAttack({ level, strMod: abilities.str, dexMod: abilities.dex, intMod: abilities.int }),
    saves: pawnSaves({ level, conMod: abilities.con, dexMod: abilities.dex, wisMod: abilities.wis }),
    perception: pawnPerception({ level, wisMod: abilities.wis }),
    classDC: maestroClassDC({ level, intMod }),
  };
}

describe("pawn-stats fixtures (DESIGN.md §2.3)", () => {
  it("fixture A: L1, Int +4, Wis +1", () => {
    const f = fixture({ level: 1, intMod: 4, wisMod: 1 });
    expect(f.abilities.str).toBe(2);
    expect(f.abilities.dex).toBe(2);
    expect(f.abilities.con).toBe(2);
    expect(f.hp).toBe(16);
    expect(f.ac).toBe(17);
    expect(f.unarmedAttack).toBe(7);
    expect(f.saves.fortitude).toBe(7);
    expect(f.saves.reflex).toBe(7);
    expect(f.saves.will).toBe(6);
    expect(f.perception).toBe(4);
    expect(f.classDC).toBe(17);
  });

  it("fixture B: L5, Int +4, Wis +1", () => {
    const f = fixture({ level: 5, intMod: 4, wisMod: 1 });
    expect(f.hp).toBe(40);
    expect(f.ac).toBe(21);
    expect(f.unarmedAttack).toBe(13);
    expect(f.saves.fortitude).toBe(11);
    expect(f.saves.reflex).toBe(11);
    expect(f.saves.will).toBe(10);
    expect(f.perception).toBe(8);
    expect(f.classDC).toBe(21);
  });

  it("fixture C: L10, Int +5, Wis +2", () => {
    const f = fixture({ level: 10, intMod: 5, wisMod: 2 });
    expect(f.hp).toBe(70);
    expect(f.ac).toBe(27);
    expect(f.unarmedAttack).toBe(19);
    expect(f.saves.fortitude).toBe(16);
    expect(f.saves.reflex).toBe(16);
    expect(f.saves.will).toBe(16);
    expect(f.perception).toBe(14);
    expect(f.classDC).toBe(29);
  });

  it("fixture D: L20, Int +6, Wis +3", () => {
    const f = fixture({ level: 20, intMod: 6, wisMod: 3 });
    expect(f.hp).toBe(150);
    expect(f.ac).toBe(42);
    expect(f.unarmedAttack).toBe(32);
    expect(f.saves.fortitude).toBe(27);
    expect(f.saves.reflex).toBe(27);
    expect(f.saves.will).toBe(27);
    expect(f.perception).toBe(25);
    expect(f.classDC).toBe(42);
  });

  it("fixture D with +3 armor potency: AC rises to 45", () => {
    const f = fixture({ level: 20, intMod: 6, wisMod: 3, armorPotency: 3 });
    expect(f.ac).toBe(45);
  });

  it("fixture E: case C as a Flesh pawn has 100 HP", () => {
    const abilities = pawnAbilityMods({ intMod: 5, wisMod: 2 });
    expect(pawnMaxHP({ level: 10, conMod: abilities.con, flesh: true })).toBe(100);
  });

  it("fixture F: L12, Int +5, Supersized (Large) has 142 HP", () => {
    const abilities = pawnAbilityMods({ intMod: 5, wisMod: 0, size: "lg" });
    expect(abilities.con).toBe(5);
    expect(pawnMaxHP({ level: 12, conMod: abilities.con, large: true })).toBe(142);
  });

  it("fixture G: case B with Manual Might has Str/Dex +4, but the attack is still +13", () => {
    const abilities = pawnAbilityMods({ intMod: 4, wisMod: 1, manualMight: true });
    expect(abilities.str).toBe(4);
    expect(abilities.dex).toBe(4);
    const attack = pawnUnarmedAttack({ level: 5, strMod: abilities.str, dexMod: abilities.dex, intMod: abilities.int });
    expect(attack).toBe(13);
  });
});

describe("pawn-stats extras (DESIGN.md §8.1)", () => {
  it("Metal pawns get +1 AC", () => {
    const abilities = pawnAbilityMods({ intMod: 4, wisMod: 1 });
    const withoutMetal = pawnAC({ level: 1, dexMod: abilities.dex, intMod: abilities.int });
    const withMetal = pawnAC({ level: 1, dexMod: abilities.dex, intMod: abilities.int, metal: true });
    expect(withMetal).toBe(withoutMetal + 1);
  });

  it("Wood pawns have Speed 30", () => {
    expect(pawnSpeed({ wood: true })).toBe(30);
  });

  it.each([
    [1, 1],
    [10, 6],
    [20, 11],
  ])("Stone resistance at L%i is %i", (level, expected) => {
    expect(stoneResistance(level)).toBe(expected);
  });

  it("Large pawns set Con to the full Int modifier", () => {
    const abilities = pawnAbilityMods({ intMod: 5, wisMod: 0, size: "lg" });
    expect(abilities.con).toBe(abilities.int);
  });

  it("Medium pawns also set Con to the full Int modifier", () => {
    const abilities = pawnAbilityMods({ intMod: 3, wisMod: 0, size: "med" });
    expect(abilities.con).toBe(abilities.int);
  });
});
