import { MODULE_ID } from "../config.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §7/§5.5 "Blitz": each chosen Controlled pawn uses a single action, which the
 * player resolves normally (a Strike picker or "other"); this just posts the reminder card.
 * Unlike the other formations, Blitz doesn't use or check the formation lock (it's a spell).
 * @param {Actor} maestro
 */
export async function castBlitz(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (!controlled.length) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.Blitz.NoneControlled", { name: maestro.name }));
    return;
  }

  const chosen = await pickPawns(controlled, {
    title: game.i18n.localize("PF2E_MAESTRO.UI.Blitz.Title"),
    hint: game.i18n.localize("PF2E_MAESTRO.UI.Blitz.Hint"),
  });
  if (!chosen?.length) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${chosen.map((p) => p.name).join(", ")} each use a single action. If multiple Strike the same creature, combine damage for resistances and weaknesses.</p>`,
  });
}
