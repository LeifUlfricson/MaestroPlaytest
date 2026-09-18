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
 * @param {"sm"|"med"|"lg"} [options.size]
 * @param {{physical: string, magical: string}|null} [options.elements]
 * @param {string} [options.img] Portrait/token art; falls back to the template's own art if omitted.
 * @param {object} [options.extraFlags] Merged into flags.pf2e-maestro.pawn (e.g. `temporary`).
 * @returns {Promise<object|null>}
 */
export async function buildPawnActorSource(maestro, { name, craft, size = "sm", elements = null, img = "", extraFlags = {} }) {
  const pack = game.packs.get(PAWN_PACK);
  const [template] = (await pack?.getDocuments({ name: "Pawn" })) ?? [];
  if (!template) {
    ui.notifications.error(game.i18n.format("PF2E_MAESTRO.UI.CreatePawn.MissingTemplate", { pack: PAWN_PACK }));
    return null;
  }

  const pawnSource = template.toObject();
  delete pawnSource._id;
  pawnSource.name = name;
  pawnSource.ownership = foundry.utils.deepClone(maestro.ownership);
  if (img) {
    pawnSource.img = img;
    foundry.utils.setProperty(pawnSource, "prototypeToken.texture.src", img);
  }
  foundry.utils.setProperty(pawnSource, "system.build.attributes.manual", true);
  foundry.utils.setProperty(pawnSource, `flags.${MODULE_ID}.pawn`, {
    maestroUuid: maestro.uuid,
    craft,
    size,
    elements,
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
 * The downtime pawn-creation wizard (DESIGN.md §5.1). Small by default; Medium is offered with
 * Bigger Figures and Large with Supersized. No Packed Pawn item yet (that's created the first
 * time the pawn is packed, src/pawns/packing.js).
 * @param {Actor} maestro
 * @returns {Promise<Actor|null>}
 */
export async function createPawn(maestro) {
  const craft = getMaestroCraft(maestro);
  const sizeChoices = availableSizes(maestro);
  const answers = await promptForDetails(maestro, craft, sizeChoices);
  if (!answers) return null;

  const pawnSource = await buildPawnActorSource(maestro, {
    name: answers.name,
    craft,
    size: answers.size,
    elements: answers.elements,
    img: answers.img,
  });
  if (!pawnSource) return null;

  const pawn = await Actor.create(pawnSource);
  if (!pawn) return null;

  const pawnUuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  await maestro.setFlag(MODULE_ID, "maestro.pawnUuids", [...pawnUuids, pawn.uuid]);

  await projectMaestro(maestro);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.FlavorText")}</p>`,
  });

  return pawn;
}

/** Bigger Figures (8) unlocks Medium; Supersized (12) also unlocks Large. */
function availableSizes(maestro) {
  const sizes = ["sm"];
  if (maestro.items.some((i) => i.slug === "bigger-figures")) sizes.push("med");
  if (maestro.items.some((i) => i.slug === "supersized")) sizes.push("lg");
  return sizes;
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

const SIZE_LABELS = { sm: "Small", med: "Medium", lg: "Large" };

/**
 * @param {Actor} maestro
 * @param {string|null} craft
 * @param {("sm"|"med"|"lg")[]} sizeChoices
 * @returns {Promise<{name: string, size: string, elements: {physical: string, magical: string}|null, img: string}|null>}
 */
async function promptForDetails(maestro, craft, sizeChoices) {
  const elementFields =
    craft === "elemental"
      ? `
        <div class="form-group">
          <label>${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.PhysicalElementLabel")}</label>
          <select name="physical">
            <option value="wood">Wood</option>
            <option value="stone">Stone</option>
            <option value="metal">Metal</option>
          </select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.MagicalElementLabel")}</label>
          <select name="magical">
            <option value="fire">Fire</option>
            <option value="cold">Cold</option>
            <option value="electricity">Electricity</option>
          </select>
        </div>
      `
      : "";

  const sizeField =
    sizeChoices.length > 1
      ? `
        <div class="form-group">
          <label>${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.SizeLabel")}</label>
          <select name="size">
            ${sizeChoices.map((s) => `<option value="${s}">${SIZE_LABELS[s]}</option>`).join("")}
          </select>
        </div>
      `
      : "";

  return foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.Title") },
    content: `
      <form class="form">
        <div class="form-group">
          <label>${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.NameLabel")}</label>
          <input type="text" name="name" value="${maestro.name}'s Pawn" autofocus>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.ArtLabel")}</label>
          <div class="form-fields">
            <file-picker name="img" type="image" value=""></file-picker>
          </div>
        </div>
        ${sizeField}
        ${elementFields}
      </form>
    `,
    ok: {
      label: game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.Confirm"),
      callback: (_event, button) => {
        const name = button.form.elements.name.value.trim();
        if (!name) return null;
        const img = button.form.elements.img.value.trim();
        const size = sizeChoices.length > 1 ? button.form.elements.size.value : sizeChoices[0];
        const elements =
          craft === "elemental"
            ? { physical: button.form.elements.physical.value, magical: button.form.elements.magical.value }
            : null;
        return { name, size, elements, img };
      },
    },
    rejectClose: false,
  });
}
