import { MODULE_ID } from "../config.js";
import { projectMaestro } from "../link/link-service.js";
import { chassisSlugFor, getMaestroCraft } from "./craft.js";

const PAWN_PACK = `${MODULE_ID}.maestro-pawns`;
const PAWN_FEATURES_PACK = `${MODULE_ID}.maestro-pawn-features`;

/**
 * Builds a new pawn actor's source data: the template actor (ancestry + Frame), the maestro's
 * Craft chassis embedded, ownership matching the maestro, and the pf2e-maestro.pawn flags.
 * Shared by the creation wizard and Rapid Assembly (src/spells/rapid-assembly.js).
 * @param {Actor} maestro
 * @param {object} options
 * @param {string} options.name
 * @param {string|null} options.craft
 * @param {{physical: string, magical: string}|null} [options.elements]
 * @param {object} [options.extraFlags] Merged into flags.pf2e-maestro.pawn (e.g. `temporary`).
 * @returns {Promise<object|null>}
 */
export async function buildPawnActorSource(maestro, { name, craft, elements = null, extraFlags = {} }) {
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
    craft,
    size: "sm",
    elements,
    form: craft === "ethereal" ? "attack" : null,
    state: "inactive",
    packed: false,
    folded: false,
    brokenHistory: [],
    temporary: null,
    vessel: false,
    ...extraFlags,
  });

  const chassis = await findChassisItem(craft);
  if (chassis) pawnSource.items.push(chassis);

  return pawnSource;
}

/**
 * The downtime pawn-creation wizard (DESIGN.md §5.1). Scoped to what's built so far: a Small
 * pawn (Bigger Figures/Supersized are M7 feats) with the maestro's Craft chassis embedded, and
 * no Packed Pawn item yet (that's created the first time the pawn is packed, src/pawns/packing.js).
 * @param {Actor} maestro
 * @returns {Promise<Actor|null>}
 */
export async function createPawn(maestro) {
  const craft = getMaestroCraft(maestro);
  const answers = await promptForDetails(maestro, craft);
  if (!answers) return null;

  const pawnSource = await buildPawnActorSource(maestro, { name: answers.name, craft, elements: answers.elements });
  if (!pawnSource) return null;

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

async function findChassisItem(craft) {
  const slug = chassisSlugFor(craft);
  if (!slug) return null;
  const pack = game.packs.get(PAWN_FEATURES_PACK);
  const index = await pack?.getIndex({ fields: ["system.slug"] });
  const entry = index?.find((e) => e.system?.slug === slug);
  if (!entry) return null;
  const source = await pack.getDocument(entry._id);
  return source.toObject();
}

/**
 * @param {Actor} maestro
 * @param {string|null} craft
 * @returns {Promise<{name: string, elements: {physical: string, magical: string}|null}|null>}
 */
async function promptForDetails(maestro, craft) {
  const elementFields =
    craft === "elemental"
      ? `
        <div class="form-group">
          <label>Physical Element</label>
          <select name="physical">
            <option value="wood">Wood</option>
            <option value="stone">Stone</option>
            <option value="metal">Metal</option>
          </select>
        </div>
        <div class="form-group">
          <label>Magical Element</label>
          <select name="magical">
            <option value="fire">Fire</option>
            <option value="cold">Cold</option>
            <option value="electricity">Electricity</option>
          </select>
        </div>
      `
      : "";

  return foundry.applications.api.DialogV2.prompt({
    window: { title: "Create Pawn" },
    content: `
      <form class="form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${maestro.name}'s Pawn" autofocus>
        </div>
        ${elementFields}
      </form>
    `,
    ok: {
      label: "Create",
      callback: (_event, button) => {
        const name = button.form.elements.name.value.trim();
        if (!name) return null;
        const elements =
          craft === "elemental"
            ? { physical: button.form.elements.physical.value, magical: button.form.elements.magical.value }
            : null;
        return { name, elements };
      },
    },
    rejectClose: false,
  });
}
