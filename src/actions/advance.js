import { MODULE_ID } from "../config.js";
import { isFormationLocked, setFormationLock } from "./formation-lock.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §5.5 "Advance!": the card says the targets Stride; the player moves the tokens
 * themselves, and this just picks the targets, sets the formation lock, and posts the card.
 * @param {Actor} maestro
 */
export async function advance(maestro) {
  if (isFormationLocked(maestro)) {
    ui.notifications.warn(game.i18n.localize("PF2E_MAESTRO.UI.TakeControl.AlreadyUsed"));
    return;
  }

  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (!controlled.length) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.Advance.NoneControlled", { name: maestro.name }));
    return;
  }

  const chosen = await pickPawns(controlled, {
    title: game.i18n.localize("PF2E_MAESTRO.UI.Advance.Title"),
    hint: game.i18n.localize("PF2E_MAESTRO.UI.Advance.Hint"),
  });
  if (!chosen?.length) return;

  await setFormationLock(maestro);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${chosen.map((p) => p.name).join(", ")} Stride.</p>`,
  });
}
