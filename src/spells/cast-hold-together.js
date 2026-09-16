import { MODULE_ID } from "../config.js";
import { createModuleEffect } from "../util/module-effects.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §7 "Hold Together": applies the Hold Together effect to any number of Controlled
 * pawns. The actual "hold at 1 HP instead of 0" intercept lives in src/pawns/lifecycle.js's
 * handleHPChange, which checks for this effect before applying the normal HP-zero transition.
 * @param {Actor} maestro
 */
export async function castHoldTogether(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (!controlled.length) {
    ui.notifications.info(`${maestro.name} has no Controlled pawns to hold together.`);
    return;
  }

  const chosen = await pickPawns(controlled, { title: "Hold Together", hint: "Choose Controlled pawns to hold together." });
  if (!chosen?.length) return;

  for (const pawn of chosen) {
    if (!pawn.itemTypes.effect?.some((e) => e.slug === "hold-together")) await createModuleEffect(pawn, "hold-together");
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${chosen.map((p) => p.name).join(", ")} will remain at 1 Hit Point the first time they'd be reduced to 0 in the next 10 minutes.</p>`,
  });
}
