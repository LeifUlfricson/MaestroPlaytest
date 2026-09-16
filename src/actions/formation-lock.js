import { MODULE_ID, SETTINGS } from "../config.js";

/**
 * DESIGN.md §5.5 "Formation lock": only one action with the formation trait per round.
 * Outside combat, the lock is ignored entirely.
 */
export function isFormationLocked(maestro) {
  if (!game.settings.get(MODULE_ID, SETTINGS.FORMATION_LOCK)) return false;
  if (!game.combat) return false;
  const used = maestro.getFlag(MODULE_ID, "maestro")?.formationUsedRound;
  return used?.combatId === game.combat.id && used?.round === game.combat.round;
}

export async function setFormationLock(maestro) {
  if (!game.combat) return;
  await maestro.setFlag(MODULE_ID, "maestro.formationUsedRound", {
    combatId: game.combat.id,
    round: game.combat.round,
  });
}
