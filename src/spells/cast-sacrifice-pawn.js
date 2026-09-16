import { MODULE_ID } from "../config.js";
import { maestroClassDC } from "../rules/pawn-stats.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §7 "Sacrifice Pawn": sets the target to 0 HP (triggering the normal lifecycle
 * transition), and posts a card for the emanation damage. Elemental pawns can swap the damage
 * type in the card; the actual damage isn't auto-rolled (basic Reflex, Assist tier).
 * @param {Actor} maestro
 */
export async function castSacrificePawn(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (!controlled.length) {
    ui.notifications.info(`${maestro.name} has no Controlled pawns to sacrifice.`);
    return;
  }

  const [target] = (await pickPawns(controlled, { title: "Sacrifice Pawn", hint: "Choose the Controlled pawn to sacrifice." })) ?? [];
  if (!target) return;

  const magicalElement = target.getFlag(MODULE_ID, "pawn")?.elements?.magical;
  const damageType = magicalElement ?? "fire";

  await target.update({ "system.attributes.hp.value": 0 });

  const level = maestro.system.details.level.value;
  const classDC = maestroClassDC({ level, intMod: maestro.system.abilities.int.mod });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${target.name} explodes for @Check[reflex|dc:${classDC}|basic] against @Damage[6d6[${damageType}]] in a 10-foot emanation.</p>`,
  });
}
