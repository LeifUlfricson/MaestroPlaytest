import { MODULE_ID } from "../config.js";
import { isFormationLocked, setFormationLock } from "./formation-lock.js";
import { pickPawns } from "../ui/pawn-picker.js";

/**
 * DESIGN.md §5.5 "Coordinated Strike" / "Coordinated Assault" / the Checkmate reminder. The
 * pawns' Strikes are rolled normally by the player at the noted penalty; this handles the
 * formation lock and posts the summary card.
 * @param {Actor} maestro
 */
export async function coordinatedStrike(maestro) {
  if (isFormationLocked(maestro)) {
    ui.notifications.warn(game.i18n.localize("PF2E_MAESTRO.UI.TakeControl.AlreadyUsed"));
    return;
  }

  const hasAssault = maestro.items.some((i) => i.slug === "coordinated-assault");
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const controlled = pawns.filter((p) => p.getFlag(MODULE_ID, "pawn")?.state === "controlled");

  if (controlled.length < 2) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.CoordinatedStrike.NotEnough", { name: maestro.name }));
    return;
  }

  const chosen = await pickPawns(controlled, {
    title: game.i18n.localize("PF2E_MAESTRO.UI.CoordinatedStrike.Title"),
    hint: game.i18n.localize("PF2E_MAESTRO.UI.CoordinatedStrike.Hint"),
  });
  if (!chosen) return;
  if (chosen.length !== 2 && !(hasAssault && chosen.length === 3)) {
    ui.notifications.warn(game.i18n.localize("PF2E_MAESTRO.UI.CoordinatedStrike.WrongCount"));
    return;
  }

  await setFormationLock(maestro);
  const penalty = chosen.length === 3 ? 4 : 2;
  let content = `<p>${chosen.map((p) => p.name).join(", ")} each make a melee or ranged Strike against a valid target, at a –${penalty} penalty, all at the same multiple attack penalty step. If multiple hits land on the same creature, combine damage before applying resistances and weaknesses.</p>`;

  const hasCheckmate = maestro.items.some((i) => i.slug === "checkmate");
  if (hasCheckmate && chosen.length === 3) {
    content += `<p><strong>Checkmate:</strong> if all 3 pawns targeted one creature and all dealt damage, double the total damage.</p>`;
  }

  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: maestro }), content });
}
