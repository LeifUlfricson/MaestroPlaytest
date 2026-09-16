/**
 * Maps a maestro's class-feature slugs to the pawn-side rule elements they imply
 * (DESIGN.md §6, "Pawn-side" column). Only features whose pawn-side effect doesn't already
 * live on a Craft chassis item belong here.
 * @param {object} input
 * @param {string[]} [input.featureSlugs] The maestro's own class-feature/feat slugs.
 */
export function buildFeatureLinkRules({ featureSlugs = [] } = {}) {
  const rules = [];

  if (featureSlugs.includes("tactical-opportunist")) {
    rules.push({ key: "AdjustStrike", property: "traits", mode: "add", value: "backstabber" });
  }

  return rules;
}
