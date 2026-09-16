import { MODULE_ID } from "../config.js";
import { getMaestroCraft } from "../pawns/craft.js";

const FOCUS_ENTRY_NAME = "Command Spells";
const SPELLS_PACK = `${MODULE_ID}.maestro-spells`;

/**
 * DESIGN.md §7: "Code does this on createItem, because a GrantItem of a spell doesn't choose
 * an entry." Each command spell here is added to the Command Spells entry once its granting
 * feat/feature is present; the granting feat/feature itself carries the focus-pool grant (see
 * grantSpell's docblock below).
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

/**
 * Serializes sync() per maestro UUID. updateActor/createItem/updateItem can all fire in close
 * succession for the same change (e.g. leveling up, or a Craft ChoiceSet answer that also
 * updates the actor); without a lock, two overlapping calls both see a grant's spell missing
 * and both create it, leaving a duplicate. Same race shape as link-service.js's pawnLocks and
 * focus-entry.js's maestroLocks, found there first via live testing.
 * @type {Map<string, Promise<void>>}
 */
const maestroLocks = new Map();

export function registerSpellGrants() {
  Hooks.on("updateActor", (actor) => queueSync(actor));
  Hooks.on("createItem", (item) => item.actor && queueSync(item.actor));
  Hooks.on("updateItem", (item) => item.actor && queueSync(item.actor));
  Hooks.once("ready", () => {
    for (const actor of game.actors) {
      if (isMaestro(actor)) queueSync(actor);
    }
  });
}

function queueSync(actor) {
  if (!isMaestro(actor)) return;
  const prior = maestroLocks.get(actor.uuid) ?? Promise.resolve();
  const next = prior.then(() => sync(actor));
  maestroLocks.set(
    actor.uuid,
    next.catch((err) => console.error(`${MODULE_ID} |`, err)),
  );
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

/**
 * The maestro's own focus pool growth (+1 per command spell, DESIGN.md §7) comes from an
 * `ActiveEffectLike add` on the granting feat/feature (maestros-craft.json for the four
 * Craft-gated spells, each granting feat for the five feat-gated ones), not from a rule on the
 * spell itself. Two things were tried and found broken by live testing: setting
 * `resources.focus.max` directly via `maestro.update()` (the system recomputes that value from
 * rule elements during data prep and stomps a manual write back to 0 every time), and putting
 * the `ActiveEffectLike` on the spell item itself (PF2E 8.4.1 discards `system.rules` on `spell`-
 * type items entirely — confirmed by embedding a hand-built spell with a rule and seeing it come
 * back empty even with no compendium involved).
 */
async function grantSpell(maestro, entry, slug) {
  const pack = game.packs.get(SPELLS_PACK);
  const index = await pack?.getIndex({ fields: ["system.slug"] });
  const found = index?.find((e) => e.system?.slug === slug);
  if (!found) return;

  const source = await pack.getDocument(found._id);
  const spellSource = source.toObject();
  foundry.utils.setProperty(spellSource, "system.location.value", entry.id);
  await maestro.createEmbeddedDocuments("Item", [spellSource]);
}
