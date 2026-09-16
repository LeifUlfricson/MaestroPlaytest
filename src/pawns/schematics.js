import { MODULE_ID } from "../config.js";

const PAWN_FEATURES_PACK = `${MODULE_ID}.maestro-pawn-features`;
const MAX_SCHEMATICS = 2;

/** Maps each Schematic maestro feat's slug to its pawn-side item's slug (DESIGN.md §6.3). */
const SCHEMATIC_ITEM_BY_FEAT_SLUG = {
  "custom-armament": "custom-armament",
  "extra-space": "extra-space",
  "adaptive-design": "adaptive-design",
  "spring-loaded-compartment": "spring-loaded-compartment",
  "air-superiority": "air-superiority",
  "injector-spike": "injector-spike",
  castle: "castle",
};

/**
 * DESIGN.md §6.3: at most 2 items with the schematic trait per pawn. Spring-Loaded Compartment
 * counts as its own slot and requires Extra Space already installed. A GM can override by
 * holding Shift when confirming the create-item dialog isn't something this module can detect
 * cleanly, so this only warns and blocks for non-GMs; a GM's own actions always go through.
 */
export function registerSchematics() {
  Hooks.on("preCreateItem", (item, _data, options, userId) => {
    if (userId !== game.userId) return true;
    if (game.user.isGM) return true;
    const pawn = item.parent;
    if (!pawn?.getFlag(MODULE_ID, "pawn")) return true;
    if (!item.system.traits?.value?.includes("schematic")) return true;

    if (item.system.slug === "spring-loaded-compartment") {
      const hasExtraSpace = pawn.itemTypes.feat?.some((i) => i.slug === "extra-space");
      if (!hasExtraSpace) {
        ui.notifications.warn(game.i18n.localize("PF2E_MAESTRO.UI.InstallSchematic.NeedsExtraSpace"));
        return false;
      }
    }

    const installed = pawn.itemTypes.feat?.filter((i) => i.system.traits?.value?.includes("schematic")) ?? [];
    if (installed.length >= MAX_SCHEMATICS) {
      ui.notifications.warn(game.i18n.format("PF2E_MAESTRO.UI.InstallSchematic.SlotLimit", { name: pawn.name, max: MAX_SCHEMATICS }));
      return false;
    }
    return true;
  });

  Hooks.on("renderActorSheet", (sheet, html) => {
    const pawn = sheet.actor;
    if (!pawn?.getFlag(MODULE_ID, "pawn")) return;
    addInstallButton(sheet, html, pawn);
  });
}

/** (verify) renderActorSheet's html argument shape and header selector against the installed system. */
function addInstallButton(sheet, html, pawn) {
  const root = html instanceof HTMLElement ? html : html[0];
  const header = root?.querySelector(".window-header .window-title")?.parentElement;
  if (!header || header.querySelector(".maestro-install-schematic")) return;

  const button = document.createElement("a");
  button.className = "maestro-install-schematic";
  button.innerHTML = `<i class="fa-solid fa-gear"></i> ${game.i18n.localize("PF2E_MAESTRO.UI.InstallSchematic.Title")}`;
  button.addEventListener("click", () => installSchematic(pawn));
  header.appendChild(button);
}

async function installSchematic(pawn) {
  const maestroUuid = pawn.getFlag(MODULE_ID, "pawn")?.maestroUuid;
  const maestro = maestroUuid ? await fromUuid(maestroUuid) : null;
  if (!maestro) return;

  const unlockedSlugs = Object.keys(SCHEMATIC_ITEM_BY_FEAT_SLUG).filter((slug) => maestro.items.some((i) => i.slug === slug));
  if (!unlockedSlugs.length) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.InstallSchematic.NoneUnlocked", { name: maestro.name }));
    return;
  }

  const choice = await promptForSchematic(unlockedSlugs);
  if (!choice) return;

  const itemSlug = SCHEMATIC_ITEM_BY_FEAT_SLUG[choice];
  const pack = game.packs.get(PAWN_FEATURES_PACK);
  const index = await pack?.getIndex({ fields: ["system.slug"] });
  const entry = index?.find((e) => e.system?.slug === itemSlug);
  if (!entry) return;

  const source = await pack.getDocument(entry._id);
  await pawn.createEmbeddedDocuments("Item", [source.toObject()]);
}

async function promptForSchematic(slugs) {
  const options = slugs.map((slug) => `<option value="${slug}">${slug}</option>`).join("");
  return foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("PF2E_MAESTRO.UI.InstallSchematic.Title") },
    content: `<form><div class="form-group"><label>${game.i18n.localize("PF2E_MAESTRO.UI.InstallSchematic.Label")}</label><select name="slug">${options}</select></div></form>`,
    ok: { label: game.i18n.localize("PF2E_MAESTRO.UI.InstallSchematic.Confirm"), callback: (_event, button) => button.form.elements.slug.value },
    rejectClose: false,
  });
}
