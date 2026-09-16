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
    ui.notifications.warn("You've already used a formation action this round.");
    return;
  }

  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (!controlled.length) {
    ui.notifications.info(`${maestro.name} has no Controlled pawns to Advance.`);
    return;
  }

  const chosen = await pickPawns(controlled, { title: "Advance!", hint: "Choose pawns to Stride." });
  if (!chosen?.length) return;

  await setFormationLock(maestro);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${chosen.map((p) => p.name).join(", ")} Stride.</p>`,
  });
}
