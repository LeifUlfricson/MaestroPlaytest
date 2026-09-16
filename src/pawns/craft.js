const CHASSIS_SLUG_BY_CRAFT = {
  flesh: "flesh-pawn",
  ethereal: "ethereal-pawn",
  elemental: "elemental-pawn",
  sympathetic: "sympathetic-pawn",
};

/**
 * The maestro's chosen Craft, read from the Maestro's Craft feature's ChoiceSet selection.
 * (verify) that ChoiceSet stores it at flags.pf2e.rulesSelections.<flag>.
 * @param {Actor} maestro
 * @returns {"flesh"|"ethereal"|"elemental"|"sympathetic"|null}
 */
export function getMaestroCraft(maestro) {
  const feature = maestro.itemTypes.feat?.find((i) => i.slug === "maestros-craft");
  return feature?.flags?.pf2e?.rulesSelections?.craft ?? null;
}

/** The pawn-side Craft chassis item's slug in maestro-pawn-features, for a given Craft. */
export function chassisSlugFor(craft) {
  return CHASSIS_SLUG_BY_CRAFT[craft] ?? null;
}
