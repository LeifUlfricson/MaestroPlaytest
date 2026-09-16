import { MODULE_ID } from "../config.js";
import { maestroClassDC } from "../rules/pawn-stats.js";
import { pickPawns } from "../ui/pawn-picker.js";

const REQUIRED_NEARBY = 2;
const NEARBY_RANGE_FT = 10;

/**
 * DESIGN.md §7 "Spatial Surge": validates the "2 other Controlled Ethereal Pawns within 10 ft
 * of the target" requirement, then posts the damage card. The line template itself isn't
 * placed automatically (Assist tier).
 * @param {Actor} maestro
 */
export async function castSpatialSurge(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(Boolean);
  const etherealControlled = pawns.filter(
    (p) => p.getFlag(MODULE_ID, "pawn")?.craft === "ethereal" && p.getFlag(MODULE_ID, "pawn")?.state === "controlled",
  );

  if (etherealControlled.length < 3) {
    ui.notifications.warn(game.i18n.localize("PF2E_MAESTRO.UI.SpatialSurge.NotEnough"));
    return;
  }

  const [target] =
    (await pickPawns(etherealControlled, {
      title: game.i18n.localize("PF2E_MAESTRO.UI.SpatialSurge.Title"),
      hint: game.i18n.localize("PF2E_MAESTRO.UI.SpatialSurge.Hint"),
    })) ?? [];
  if (!target) return;

  const targetToken = target.getActiveTokens()[0];
  const others = etherealControlled.filter((p) => p.id !== target.id);
  const nearby = targetToken ? others.filter((p) => p.getActiveTokens()[0]?.distanceTo(targetToken) <= NEARBY_RANGE_FT) : [];

  if (nearby.length < REQUIRED_NEARBY) {
    ui.notifications.warn(game.i18n.format("PF2E_MAESTRO.UI.SpatialSurge.TooFar", { name: target.name }));
    return;
  }

  const level = maestro.system.details.level.value;
  const classDC = maestroClassDC({ level, intMod: maestro.system.abilities.int.mod });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>A 60-foot line of force erupts from ${target.name}: @Check[reflex|dc:${classDC}|basic] against @Damage[10d10[force]]. The line passes through walls.</p>`,
  });
}
