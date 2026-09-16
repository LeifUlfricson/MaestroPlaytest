import { MODULE_ID } from "../config.js";
import { projectMaestro } from "../link/link-service.js";

const PAWN_PACK = `${MODULE_ID}.maestro-pawns`;

/**
 * The downtime pawn-creation wizard (DESIGN.md §5.1). Scoped to what M2 supports: a Small pawn
 * with no Craft chassis yet (that lands with the Crafts in M4) and no Packed Pawn item yet
 * (that lands with packing in M3).
 * @param {Actor} maestro
 * @returns {Promise<Actor|null>}
 */
export async function createPawn(maestro) {
  const name = await promptForName(maestro);
  if (!name) return null;

  const pack = game.packs.get(PAWN_PACK);
  const [template] = (await pack?.getDocuments({ name: "Pawn" })) ?? [];
  if (!template) {
    ui.notifications.error(`${MODULE_ID} | Could not find the "Pawn" template actor in ${PAWN_PACK}.`);
    return null;
  }

  const pawnSource = template.toObject();
  delete pawnSource._id;
  pawnSource.name = name;
  pawnSource.ownership = foundry.utils.deepClone(maestro.ownership);
  foundry.utils.setProperty(pawnSource, "system.build.attributes.manual", true);
  foundry.utils.setProperty(pawnSource, `flags.${MODULE_ID}.pawn`, {
    maestroUuid: maestro.uuid,
    craft: maestro.getFlag(MODULE_ID, "maestro")?.craft ?? null,
    size: "sm",
    elements: null,
    form: null,
    state: "inactive",
    packed: false,
    folded: false,
    brokenHistory: [],
    temporary: null,
    vessel: false,
  });

  const pawn = await Actor.create(pawnSource);
  if (!pawn) return null;

  const pawnUuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  await maestro.setFlag(MODULE_ID, "maestro.pawnUuids", [...pawnUuids, pawn.uuid]);

  await projectMaestro(maestro);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>Creating a pawn takes 1 hour, a flat surface, tools, and 1 Bulk of materials.</p>`,
  });

  return pawn;
}

/** @param {Actor} maestro @returns {Promise<string|null>} */
async function promptForName(maestro) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: "Create Pawn" },
    content: `
      <form class="form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${maestro.name}'s Pawn" autofocus>
        </div>
      </form>
    `,
    ok: {
      label: "Create",
      callback: (_event, button) => button.form.elements.name.value.trim() || null,
    },
    rejectClose: false,
  });
}
