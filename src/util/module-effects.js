import { MODULE_ID } from "../config.js";

/** Embeds a copy of a maestro-effects compendium item (by its slug) onto an actor. */
export async function createModuleEffect(actor, slug) {
  const pack = game.packs.get(`${MODULE_ID}.maestro-effects`);
  const index = await pack.getIndex({ fields: ["system.slug"] });
  const entry = index.find((e) => e.system?.slug === slug);
  if (!entry) return null;
  const source = await pack.getDocument(entry._id);
  const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
  return created;
}

/** Removes an actor's embedded effect with the given slug, if present. */
export async function removeModuleEffect(actor, slug) {
  const effect = actor.itemTypes.effect?.find((e) => e.slug === slug);
  if (effect) await effect.delete();
}
