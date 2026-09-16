import { MODULE_ID } from "../config.js";
import { getMaestroCraft } from "../pawns/craft.js";

const FOCUS_ENTRY_NAME = "Command Spells";
const SPELLS_PACK = `${MODULE_ID}.maestro-spells`;

/**
 * DESIGN.md §7: "Code does this on createItem, because a GrantItem of a spell doesn't choose
 * an entry." Each command spell here is added to the Command Spells entry once its granting
 * feat/feature is present, and the focus pool grows by 1 with it. The four Craft-gated grants
 * (Elemental Font, Puppet's Curse, Blood of the Master, Spatial Surge) work now; the five
 * feat-gated ones wait on M7's feats to exist (Second String, Sacrifice Pawn, Project Senses,
 * Master's Will, Dextrous Mind) — their conditions are just always false until then.
 */
const GRANTS = [
  { spellSlug: "elemental-font", condition: (m) => getMaestroCraft(m) === "elemental" && levelOf(m) >= 5 },
  { spellSlug: "puppets-curse", condition: (m) => getMaestroCraft(m) === "sympathetic" && levelOf(m) >= 5 },
  { spellSlug: "blood-of-the-master", condition: (m) => getMaestroCraft(m) === "flesh" && levelOf(m) >= 17 },
  { spellSlug: "spatial-surge", condition: (m) => getMaestroCraft(m) === "ethereal" && levelOf(m) >= 17 },
  { spellSlug: "rapid-assembly", condition: (m) => hasFeat(m, "second-string") },
  { spellSlug: "sacrifice-pawn", condition: (m) => hasFeat(m, "sacrifice-pawn") },
  { spellSlug: "project-senses", condition: (m) => hasFeat(m, "project-senses") },
  { spellSlug: "hold-together", condition: (m) => hasFeat(m, "masters-will") },
  { spellSlug: "blitz", condition: (m) => hasFeat(m, "dextrous-mind") },
];

function levelOf(maestro) {
  return maestro.system.details.level.value;
}

function hasFeat(maestro, slug) {
  return maestro.items.some((i) => i.slug === slug);
}

export function registerSpellGrants() {
  Hooks.on("updateActor", (actor) => sync(actor));
  Hooks.on("createItem", (item) => item.actor && sync(item.actor));
  Hooks.on("updateItem", (item) => item.actor && sync(item.actor));
  Hooks.once("ready", () => {
    for (const actor of game.actors) {
      if (isMaestro(actor)) sync(actor).catch((err) => console.error(`${MODULE_ID} |`, err));
    }
  });
}

function isMaestro(actor) {
  return actor?.type === "character" && actor.items.some((i) => i.type === "class" && i.slug === "maestro");
}

async function sync(maestro) {
  if (!isMaestro(maestro)) return;
  const entry = maestro.itemTypes.spellcastingEntry?.find((e) => e.name === FOCUS_ENTRY_NAME);
  if (!entry) return;

  for (const grant of GRANTS) {
    const already = maestro.itemTypes.spell?.some((s) => s.slug === grant.spellSlug && s.system.location?.value === entry.id);
    if (!already && grant.condition(maestro)) await grantSpell(maestro, entry, grant.spellSlug);
  }
}

/** (verify) system.resources.focus.max against the installed system. */
async function grantSpell(maestro, entry, slug) {
  const pack = game.packs.get(SPELLS_PACK);
  const index = await pack?.getIndex({ fields: ["system.slug"] });
  const found = index?.find((e) => e.system?.slug === slug);
  if (!found) return;

  const source = await pack.getDocument(found._id);
  const spellSource = source.toObject();
  foundry.utils.setProperty(spellSource, "system.location.value", entry.id);
  await maestro.createEmbeddedDocuments("Item", [spellSource]);

  const currentMax = maestro.system.resources?.focus?.max ?? 0;
  await maestro.update({ "system.resources.focus.max": currentMax + 1 });
}
