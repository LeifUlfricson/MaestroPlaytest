import { MODULE_ID, SETTINGS } from "../config.js";
import { controlWeight, pawnCap } from "../rules/progression.js";
import { setControlled, setInactive } from "../pawns/lifecycle.js";
import { unpackPawn } from "../pawns/packing.js";
import { pickPawns } from "../ui/pawn-picker.js";

const REACH_FT = 10;

/**
 * DESIGN.md §5.5 "Take Control". Frequency (once/round), Blood of the Master and Rapid
 * Assembly bypasses, and the level-19 free-action swap (Instinctive Control) aren't
 * implemented yet — those need the Crafts (M4) and command spells (M6).
 * @param {Actor} maestro
 */
export async function takeControl(maestro) {
  const pawns = await pawnsOf(maestro);
  const eligible = pawns.filter((p) => isEligible(p, maestro));
  if (!eligible.length) {
    ui.notifications.info(`${maestro.name} has no Inactive pawns within reach to Control.`);
    return;
  }

  const chosen = await pickPawns(eligible, { title: "Take Control", hint: "Choose Inactive pawns to Control." });
  if (!chosen?.length) return;

  if (game.settings.get(MODULE_ID, SETTINGS.ENFORCE_CONTROL_CAP)) {
    const released = await enforceControlCap(maestro, pawns, chosen);
    if (released === null) return; // the player cancelled the release prompt
  }

  for (const pawn of chosen) {
    if (pawn.getFlag(MODULE_ID, "pawn")?.packed) await unpackPawn(pawn, maestro);
    await setControlled(pawn);
  }
}

async function enforceControlCap(maestro, allPawns, chosen) {
  const level = maestro.system.details.level.value;
  const cap = pawnCap(level);
  const controlled = allPawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");
  const weight = (list) => list.reduce((sum, p) => sum + controlWeight(p.getFlag(MODULE_ID, "pawn") ?? {}), 0);

  const overBy = weight(controlled) + weight(chosen) - cap;
  if (overBy <= 0) return [];

  const toRelease = await pickPawns(controlled, {
    title: "Release Control",
    hint: `Controlling ${chosen.length} more pawn(s) exceeds your cap of ${cap}. Choose Controlled pawns to release.`,
  });
  if (toRelease === null) return null;

  for (const pawn of toRelease) await setInactive(pawn);
  if (weight(controlled.filter((p) => !toRelease.includes(p))) + weight(chosen) > cap) {
    ui.notifications.warn(`${maestro.name} is still over the control cap of ${cap}.`);
  }
  return toRelease;
}

function isEligible(pawn, maestro) {
  const flags = pawn.getFlag(MODULE_ID, "pawn") ?? {};
  if (flags.state !== "inactive") return false;
  if (flags.vessel) return false;
  if (pawn.itemTypes.effect?.some((e) => e.slug === "broken-pawn")) return false;
  if ((pawn.system.attributes?.hp?.value ?? 0) <= 0) return false;
  if (flags.packed) return true;
  return isWithinReach(pawn, maestro);
}

function isWithinReach(pawn, maestro) {
  const maestroToken = maestro.getActiveTokens()[0];
  const pawnToken = pawn.getActiveTokens()[0];
  if (!maestroToken || !pawnToken) return false;
  return maestroToken.distanceTo(pawnToken) <= REACH_FT;
}

async function pawnsOf(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = await Promise.all(uuids.map((u) => fromUuid(u)));
  return pawns.filter(Boolean);
}
