/** Maximum Controlled pawns by maestro level; Large pawns count as 2 (DESIGN.md §2.2, §5.5). */
export function pawnCap(level) {
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

/** How much a single pawn counts against the control cap. */
export function controlWeight({ size = "sm" } = {}) {
  return size === "lg" ? 2 : 1;
}

/**
 * Range of Control in feet (DESIGN.md §5.4). Expanded Control (feat 4) and Superior Control
 * (feat 12) each add 30 ft; neither is implemented yet (M7), so this is always 30 for now.
 */
export function rangeOfControl({ expandedControl = false, superiorControl = false } = {}) {
  let range = 30;
  if (expandedControl) range += 30;
  if (superiorControl) range += 30;
  return range;
}

/** A pawn's Bulk while Inactive/packed, before any Craft- or feat-specific override (DESIGN.md §2.2). */
export function pawnBulk({ size = "sm" } = {}) {
  if (size === "lg") return 6;
  if (size === "med") return 2;
  return 1;
}
