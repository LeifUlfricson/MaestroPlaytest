/**
 * Pure functions that turn a plain snapshot of a maestro (and one of its pawns) into the
 * source data the link service writes to that pawn: the actor update patch and the rule
 * elements for the generated "Maestro Link" effect (DESIGN.md §4.3). No Foundry globals.
 */

import { stoneResistance } from "../rules/pawn-stats.js";

/** Elemental Craft's magical-element trait remapping: cold -> water, electricity -> air (DESIGN.md §2.4). */
const MAGICAL_ELEMENT_TRAIT = { fire: "fire", cold: "water", electricity: "air" };
/** Elemental Craft's physical-element trait: wood -> wood, stone -> earth, metal -> metal (DESIGN.md §2.4). */
const PHYSICAL_ELEMENT_TRAIT = { wood: "wood", stone: "earth", metal: "metal" };

/**
 * The pawn actor source patch: level and the six ability modifiers (DESIGN.md §2.2, §4.3).
 * @param {object} input
 * @param {number} input.level
 * @param {{str:number, dex:number, con:number, int:number, wis:number, cha:number}} input.abilities
 */
export function buildPawnUpdate({ level, abilities }) {
  return {
    "system.details.level.value": level,
    "system.abilities.str.mod": abilities.str,
    "system.abilities.dex.mod": abilities.dex,
    "system.abilities.con.mod": abilities.con,
    "system.abilities.int.mod": abilities.int,
    "system.abilities.wis.mod": abilities.wis,
    "system.abilities.cha.mod": abilities.cha,
  };
}

/**
 * The rule elements for the generated "Maestro Link" effect (DESIGN.md §4.3, item 2).
 * Feature-map-driven grants (§6) aren't included yet; those land as each feature/craft is built.
 * @param {object} input
 * @param {number} input.intMod
 * @param {number} [input.armorPotency]
 * @param {boolean} [input.metal] Elemental Craft's metal physical element.
 * @param {number} [input.resilientRank]
 * @param {{slug: string, rank: number, itemBonus?: number}[]} [input.skills]
 * @param {number} [input.weaponPotency]
 * @param {number} [input.strikingRank]
 * @param {string[]} [input.propertyRunes]
 * @param {"sm"|"med"|"lg"} [input.size]
 */
export function buildLinkItemRules({
  intMod,
  armorPotency = 0,
  metal = false,
  resilientRank = 0,
  skills = [],
  weaponPotency = 0,
  strikingRank = 0,
  propertyRunes = [],
  size = "sm",
} = {}) {
  const rules = [];

  rules.push({
    key: "FlatModifier",
    selector: "ac",
    type: "item",
    value: intMod + armorPotency + (metal ? 1 : 0),
  });
  rules.push({ key: "DexterityModifierCap", value: 0 });

  rules.push({
    key: "FlatModifier",
    selector: "strike-attack-roll",
    type: "ability",
    ability: "int",
  });

  if (resilientRank > 0) {
    rules.push({ key: "FlatModifier", selector: "saving-throw", type: "item", value: resilientRank });
  }

  for (const skill of skills) {
    if (skill.rank > 0) {
      rules.push({ key: "ActiveEffectLike", mode: "upgrade", path: `system.skills.${skill.slug}.rank`, value: skill.rank });
    }
    if (skill.itemBonus > 0) {
      rules.push({ key: "FlatModifier", selector: skill.slug, type: "item", value: skill.itemBonus });
    }
  }

  if (weaponPotency > 0) rules.push({ key: "WeaponPotency", value: weaponPotency });
  if (strikingRank > 0) rules.push({ key: "Striking", value: strikingRank });
  for (const rune of propertyRunes) {
    rules.push({ key: "AdjustStrike", property: "property-runes", mode: "add", value: rune });
  }

  if (size !== "sm") {
    rules.push({ key: "CreatureSize", value: size });
  }
  if (size === "lg") {
    rules.push({ key: "FlatModifier", selector: "hp-per-level", type: "untyped", value: 2 });
    rules.push({ key: "ActiveEffectLike", mode: "add", path: "system.attributes.reach.base", value: 5 });
  }

  return rules;
}

/** Deep-equality check used to skip writing when projection would be a no-op (DESIGN.md §4.3, item 3). */
export function rulesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The Craft-dependent rule elements for the generated "Maestro Link" effect (DESIGN.md §6.1):
 * the Ethereal form roll option the chassis Strikes predicate on, and the Elemental traits,
 * Solid Body Speed/Resistance, and the physical/magical-element roll options the chassis Strike's
 * conditional traits (parry, the magical-element trait) predicate on. Elemental Warding and
 * Elemental Avatar are level-gated rule elements on the static chassis item instead, since they
 * don't depend on which element was chosen.
 * @param {object} input
 * @param {"flesh"|"ethereal"|"elemental"|"sympathetic"|null} [input.craft]
 * @param {{physical: string, magical: string}|null} [input.elements]
 * @param {"attack"|"defense"|null} [input.form]
 * @param {number} [input.level]
 */
export function buildCraftLinkRules({ craft, elements, form, level } = {}) {
  const rules = [];

  if (craft === "ethereal" && form) {
    rules.push({ key: "RollOption", domain: "all", option: `ethereal-form:${form}` });
  }

  if (craft === "elemental" && elements) {
    rules.push({ key: "RollOption", domain: "all", option: `physical-element:${elements.physical}` });
    rules.push({ key: "RollOption", domain: "all", option: `magical-element:${elements.magical}` });

    const physicalTrait = PHYSICAL_ELEMENT_TRAIT[elements.physical];
    if (physicalTrait) rules.push({ key: "ActiveEffectLike", mode: "add", path: "system.traits.value", value: physicalTrait });

    const magicalTrait = MAGICAL_ELEMENT_TRAIT[elements.magical];
    if (magicalTrait) rules.push({ key: "ActiveEffectLike", mode: "add", path: "system.traits.value", value: magicalTrait });

    if (elements.physical === "wood") {
      rules.push({ key: "FlatModifier", selector: "speed", type: "untyped", value: 5 });
    }
    if (elements.physical === "stone") {
      rules.push({ key: "Resistance", type: "physical", value: stoneResistance(level) });
    }
  }

  return rules;
}
