import { MODULE_ID } from "../config.js";
import { buildPawnActorSource } from "../pawns/create-pawn.js";
import { placeToken } from "../pawns/packing.js";
import { setControlled, setDestroyed } from "../pawns/lifecycle.js";
import { getMaestroCraft } from "../pawns/craft.js";
import { projectMaestro } from "../link/link-service.js";

const DURATION_SECONDS = 600;

/**
 * DESIGN.md §7 "Rapid Assembly": creates a temporary Small pawn, places it near the maestro,
 * and Takes Control of it immediately (skipping the frequency and reach checks, as written).
 * The cap still applies in principle, but isn't enforced here — an Assist-tier simplification.
 * Heightening (+4, an extra pawn) isn't implemented; cast this once per extra pawn instead.
 * @param {Actor} maestro
 */
export async function castRapidAssembly(maestro) {
  const craft = getMaestroCraft(maestro);
  if (!craft) {
    ui.notifications.warn(`${maestro.name} hasn't chosen a Craft yet.`);
    return;
  }

  const pawnSource = await buildPawnActorSource(maestro, {
    name: `${maestro.name}'s Temporary Pawn`,
    craft,
    extraFlags: { temporary: { expiresAt: game.time.worldTime + DURATION_SECONDS } },
  });
  if (!pawnSource) return;

  const pawn = await Actor.create(pawnSource);
  if (!pawn) return;

  await placeToken(pawn, maestro);

  const pawnUuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  await maestro.setFlag(MODULE_ID, "maestro.pawnUuids", [...pawnUuids, pawn.uuid]);
  await projectMaestro(maestro);
  await setControlled(pawn);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${pawn.name} is assembled and Controlled. It crumbles back into inert materials in 10 minutes.</p>`,
  });
}

/** Expires Rapid Assembly's temporary pawns once game time passes their expiresAt flag. */
export function registerRapidAssemblyExpiry() {
  Hooks.on("updateWorldTime", () => {
    expireTemporaryPawns().catch((err) => console.error(`${MODULE_ID} |`, err));
  });
}

async function expireTemporaryPawns() {
  for (const actor of game.actors) {
    const temporary = actor.getFlag(MODULE_ID, "pawn")?.temporary;
    if (temporary?.expiresAt !== undefined && game.time.worldTime >= temporary.expiresAt) {
      await setDestroyed(actor);
    }
  }
}
