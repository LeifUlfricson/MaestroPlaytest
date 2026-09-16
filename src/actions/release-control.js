import { MODULE_ID } from "../config.js";
import { setInactive } from "../pawns/lifecycle.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §5.5 "Release Control": choose Controlled pawns, which become Inactive.
 * @param {Actor} maestro
 */
export async function releaseControl(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (!controlled.length) {
    ui.notifications.info(`${maestro.name} has no Controlled pawns to release.`);
    return;
  }

  const chosen = await pickPawns(controlled, { title: "Release Control", hint: "Choose Controlled pawns to release." });
  for (const pawn of chosen ?? []) await setInactive(pawn);
}
