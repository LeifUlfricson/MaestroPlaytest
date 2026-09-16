/**
 * Pure functions that turn a plain snapshot of a maestro (and one of its pawns) into the
 * source data the link service writes to that pawn: the actor update patch and the rule
 * elements for the generated "Maestro Link" effect (DESIGN.md §4.3). No Foundry globals.
 */

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
