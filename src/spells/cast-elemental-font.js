import { MODULE_ID } from "../config.js";
import { maestroClassDC } from "../rules/pawn-stats.js";
import { createModuleEffect, removeModuleEffect } from "../util/module-effects.js";
import { pickPawns } from "../ui/pawn-picker.js";

/** DESIGN.md §7 "Elemental Font": applies the Elemental Font (Aura) effect and posts the card. */
export async function castElementalFont(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const elementalControlled = pawns.filter(
    (p) => p.getFlag(MODULE_ID, "pawn")?.craft === "elemental" && p.getFlag(MODULE_ID, "pawn")?.state === "controlled",
  );

  if (!elementalControlled.length) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.ElementalFont.NoneEligible", { name: maestro.name }));
    return;
  }

  const [target] =
    (await pickPawns(elementalControlled, {
      title: game.i18n.localize("PF2E_MAESTRO.UI.ElementalFont.Title"),
      hint: game.i18n.localize("PF2E_MAESTRO.UI.ElementalFont.Hint"),
    })) ?? [];
  if (!target) return;

  await removeModuleEffect(target, "elemental-font-aura");
  await createModuleEffect(target, "elemental-font-aura");

  const level = maestro.system.details.level.value;
  const classDC = maestroClassDC({ level, intMod: maestro.system.abilities.int.mod });
  const damageType = target.getFlag(MODULE_ID, "pawn")?.elements?.magical ?? "fire";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${target.name} radiates elemental energy: adjacent creatures face @Check[fortitude|dc:${classDC}|basic] against @Damage[2d6[${damageType}]], again on each Sustain.</p>`,
  });
}
