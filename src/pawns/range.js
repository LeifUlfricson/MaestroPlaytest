import { MODULE_ID, SETTINGS } from "../config.js";
import { rangeOfControl } from "../rules/progression.js";
import { setInactive } from "./lifecycle.js";

/** DESIGN.md §5.4: a Controlled pawn outside its maestro's Range of Control becomes Inactive. */
export function registerRangeWatcher() {
  Hooks.on("updateToken", (tokenDoc, changed) => {
    if (!("x" in changed || "y" in changed || "elevation" in changed)) return;
    checkAffectedPawns(tokenDoc).catch((err) => console.error(`${MODULE_ID} |`, err));
  });
}

async function checkAffectedPawns(movedTokenDoc) {
  const actor = movedTokenDoc.actor;
  if (!actor) return;

  if (actor.getFlag(MODULE_ID, "maestro")) {
    const pawnUuids = actor.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
    for (const uuid of pawnUuids) {
      const pawn = await fromUuid(uuid);
      if (pawn?.getFlag(MODULE_ID, "pawn")?.state === "controlled") await checkOnePawn(actor, pawn);
    }
    return;
  }

  const pawnFlags = actor.getFlag(MODULE_ID, "pawn");
  if (pawnFlags?.state === "controlled" && pawnFlags.maestroUuid) {
    const maestro = await fromUuid(pawnFlags.maestroUuid);
    if (maestro) await checkOnePawn(maestro, actor);
  }
}

/** (verify) Token#distanceTo against the installed v14 canvas API. */
async function checkOnePawn(maestro, pawn) {
  if (!game.settings.get(MODULE_ID, SETTINGS.AUTO_INACTIVE_ON_RANGE)) return;
  const maestroToken = maestro.getActiveTokens()[0];
  const pawnToken = pawn.getActiveTokens()[0];
  if (!maestroToken || !pawnToken) return;

  if (maestroToken.distanceTo(pawnToken) > maestroRange(maestro)) await setInactive(pawn);
}

/** The maestro's current Range of Control, per Expanded Control (4) and Superior Control (12). */
export function maestroRange(maestro) {
  return rangeOfControl({
    expandedControl: maestro.items.some((i) => i.slug === "expanded-control"),
    superiorControl: maestro.items.some((i) => i.slug === "superior-control"),
  });
}
