import { MODULE_ID } from "../config.js";
import { createModuleEffect, removeModuleEffect } from "../util/module-effects.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §7 "Project Senses": applies the Project Senses effect to a chosen pawn (any
 * state — even Inactive). Sustaining and moving the effect to another pawn is manual for now.
 * @param {Actor} maestro
 */
export async function castProjectSenses(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(
    (p) => p && p.getFlag(MODULE_ID, "pawn")?.state !== "destroyed",
  );

  if (!pawns.length) {
    ui.notifications.info(`${maestro.name} has no pawns to project senses through.`);
    return;
  }

  const [target] = (await pickPawns(pawns, { title: "Project Senses", hint: "Choose a pawn to perceive through." })) ?? [];
  if (!target) return;

  for (const pawn of pawns) await removeModuleEffect(pawn, "project-senses");
  await createModuleEffect(target, "project-senses");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${maestro.name} perceives through ${target.name}.</p>`,
  });
}
