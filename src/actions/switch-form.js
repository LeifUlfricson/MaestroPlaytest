import { MODULE_ID } from "../config.js";
import { projectMaestro } from "../link/link-service.js";
import { pickPawns } from "../ui/pawn-picker.js";

const OTHER_FORM = { attack: "defense", defense: "attack" };

/**
 * DESIGN.md's Ethereal Craft "Versatile Form": flips the chosen Controlled Ethereal pawns
 * between attack and defense form. The Strikes that predicate on ethereal-form:* pick up the
 * change the next time projection runs.
 * @param {Actor} maestro
 */
export async function switchForm(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const etherealControlled = pawns.filter(
    (p) => p.getFlag(MODULE_ID, "pawn")?.craft === "ethereal" && p.getFlag(MODULE_ID, "pawn")?.state === "controlled",
  );

  if (!etherealControlled.length) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.SwitchForm.NoneEligible", { name: maestro.name }));
    return;
  }

  const chosen = await pickPawns(etherealControlled, {
    title: game.i18n.localize("PF2E_MAESTRO.UI.SwitchForm.Title"),
    hint: game.i18n.localize("PF2E_MAESTRO.UI.SwitchForm.Hint"),
  });
  if (!chosen?.length) return;

  for (const pawn of chosen) {
    const form = pawn.getFlag(MODULE_ID, "pawn")?.form ?? "attack";
    await pawn.setFlag(MODULE_ID, "pawn.form", OTHER_FORM[form] ?? "attack");
  }

  await projectMaestro(maestro);
}
