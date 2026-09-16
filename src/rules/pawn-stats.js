/** Proficiency ranks, matching the PF2e numeric scale. */
export const RANK = { untrained: 0, trained: 1, expert: 2, master: 3, legendary: 4 };

/** @param {number} rank @param {number} level */
export function profBonus(rank, level) {
  return rank > 0 ? level + rank * 2 : 0;
}

/** Pawn unarmored-defense proficiency rank at a given maestro level (DESIGN.md §2.2). */
export function unarmoredRank(level) {
  if (level >= 19) return RANK.master;
  if (level >= 11) return RANK.expert;
  return RANK.trained;
}

/** Pawn unarmed-attack proficiency rank at a given maestro level (DESIGN.md §2.2). */
export function unarmedRank(level) {
  if (level >= 13) return RANK.master;
  if (level >= 5) return RANK.expert;
  return RANK.trained;
}

/** Maestro class DC proficiency rank at a given level (DESIGN.md §2.1). */
export function maestroClassDCRank(level) {
  if (level >= 17) return RANK.master;
  if (level >= 9) return RANK.expert;
  return RANK.trained;
}

/**
 * Pawn Str/Dex/Con/Int/Wis/Cha modifiers (DESIGN.md §2.2).
 * @param {object} input
 * @param {number} input.intMod
 * @param {number} input.wisMod
 * @param {number} [input.chaMod]
 * @param {boolean} [input.manualMight] Both of the maestro's hands are free.
 * @param {"sm"|"med"|"lg"} [input.size]
 */
export function pawnAbilityMods({ intMod, wisMod, chaMod = 0, manualMight = false, size = "sm" }) {
  const half = Math.floor(intMod / 2);
  const setConToInt = size === "med" || size === "lg";
  return {
    str: manualMight ? intMod : half,
    dex: manualMight ? intMod : half,
    con: setConToInt ? intMod : half,
    int: intMod,
    wis: wisMod,
    cha: chaMod,
  };
}

/**
 * Pawn maximum Hit Points (DESIGN.md §2.2, §2.3 fixtures E/F).
 * @param {object} input
 * @param {number} input.level
 * @param {number} input.conMod
 * @param {boolean} [input.flesh] Flesh Craft's Connective Tissue (5th).
 * @param {boolean} [input.large] Large pawn (Supersized).
 */
export function pawnMaxHP({ level, conMod, flesh = false, large = false }) {
  const perLevel = (large ? 6 : 4) + conMod + (flesh ? 3 : 0);
  return 10 + perLevel * level;
}

/**
 * Pawn AC (DESIGN.md §2.2). Dex modifier is capped at +0 (a penalty still applies).
 * @param {object} input
 * @param {number} input.level
 * @param {number} input.dexMod
 * @param {number} input.intMod Item bonus source.
 * @param {number} [input.armorPotency]
 * @param {boolean} [input.metal] Elemental Craft's metal physical element.
 */
export function pawnAC({ level, dexMod, intMod, armorPotency = 0, metal = false }) {
  const itemBonus = intMod + armorPotency + (metal ? 1 : 0);
  const dexContribution = Math.min(dexMod, 0);
  return 10 + profBonus(unarmoredRank(level), level) + itemBonus + dexContribution;
}

/**
 * Pawn unarmed Strike attack bonus. Int always qualifies alongside Str and Dex (DESIGN.md §2.2).
 * @param {object} input
 * @param {number} input.level
 * @param {number} input.strMod
 * @param {number} input.dexMod
 * @param {number} input.intMod
 */
export function pawnUnarmedAttack({ level, strMod, dexMod, intMod }) {
  return profBonus(unarmedRank(level), level) + Math.max(strMod, dexMod, intMod);
}

/** Pawn saving throws: expert in all three, never improves (DESIGN.md §2.2). */
export function pawnSaves({ level, conMod, dexMod, wisMod }) {
  const bonus = profBonus(RANK.expert, level);
  return {
    fortitude: bonus + conMod,
    reflex: bonus + dexMod,
    will: bonus + wisMod,
  };
}

/** Pawn Perception: trained, never improves (DESIGN.md §2.2). */
export function pawnPerception({ level, wisMod }) {
  return profBonus(RANK.trained, level) + wisMod;
}

/** Pawn Speed in feet (DESIGN.md §2.2). Wood pawns get +5 to all Speeds. */
export function pawnSpeed({ wood = false } = {}) {
  return 25 + (wood ? 5 : 0);
}

/** Elemental Craft's Stone physical element: resistance to physical damage (DESIGN.md §2.4). */
export function stoneResistance(level) {
  return 1 + Math.floor(level / 2);
}

/** The maestro's own class DC (DESIGN.md §2.1), used e.g. as the pawn's counteract DC. */
export function maestroClassDC({ level, intMod }) {
  return 10 + profBonus(maestroClassDCRank(level), level) + intMod;
}
