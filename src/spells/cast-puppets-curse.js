import { MODULE_ID } from "../config.js";

/**
 * DESIGN.md §7 "Puppet's Curse": validates that the user has a token targeted that's fatebound
 * to one of this maestro's pawns, then posts the Will-save card. Degree resolution (how many
 * actions are compelled, or ending the spell on "harm itself") is left to the GM, Assist tier.
 * @param {Actor} maestro
 */
export async function castPuppetsCurse(maestro) {
  const target = game.user.targets.first()?.actor;
  if (!target) {
    ui.notifications.warn("Target the fatebound creature first.");
    return;
  }

  const fatebound = target.itemTypes.effect?.find((e) => e.slug === "fatebound" && e.getFlag(MODULE_ID, "maestroUuid") === maestro.uuid);
  if (!fatebound) {
    ui.notifications.warn(`${target.name} isn't fatebound to one of ${maestro.name}'s pawns.`);
    return;
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${target.name} attempts a Will save against ${maestro.name}'s puppet's curse. Success: unaffected. Failure: 1 compelled action. Critical Failure: 2 compelled actions (or one 2-action activity). Compelling the target to harm itself ends the spell and its fatebound condition instead.</p>`,
  });
}
