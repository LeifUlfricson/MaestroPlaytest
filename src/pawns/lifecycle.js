import { MODULE_ID } from "../config.js";
import { drawTether, removeTether } from "../integrations/tethers.js";
import { replacePackedPawnWithRemains } from "./packing.js";

const BROKEN_WINDOW_SECONDS = 600;

export function registerLifecycleHooks() {
  Hooks.on("preUpdateActor", (actor, changed, options) => {
    if (!isPawn(actor)) return;
    const newHP = foundry.utils.getProperty(changed, "system.attributes.hp.value");
    if (newHP === undefined) return;
    options.maestroPawnOldHP = actor.system.attributes.hp.value;
  });

  Hooks.on("updateActor", (actor, changed, options) => {
    if (!isPawn(actor)) return;
    const newHP = foundry.utils.getProperty(changed, "system.attributes.hp.value");
    if (newHP === undefined) return;
    handleHPChange(actor, options.maestroPawnOldHP, newHP).catch((err) => console.error(`${MODULE_ID} |`, err));
  });

  Hooks.on("createItem", (item) => handleConditionChange(item));
  Hooks.on("updateItem", (item) => handleConditionChange(item));
}

function isPawn(actor) {
  return !!actor?.getFlag?.(MODULE_ID, "pawn");
}

/** DESIGN.md §5.2 "HP triggers". (verify) against the real damage-apply flow. */
async function handleHPChange(pawn, oldHP, newHP) {
  if (oldHP === undefined) return;
  if (oldHP === 0 && newHP === 0) {
    await setDestroyed(pawn);
    return;
  }
  if (oldHP > 0 && newHP <= 0) {
    await setInactive(pawn, { reason: "hp-zero" });
    await addBroken(pawn);
  }
}

/** DESIGN.md §5.2 "Maestro unconscious": all Controlled pawns go Inactive, unless Beyond the Pale. */
async function handleConditionChange(item) {
  const maestro = item.actor;
  if (!maestro || item.slug !== "unconscious") return;
  if (maestro.items.some((i) => i.slug === "beyond-the-pale")) return;
  const pawnUuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  for (const uuid of pawnUuids) {
    const pawn = await fromUuid(uuid);
    if (pawn?.getFlag(MODULE_ID, "pawn")?.state === "controlled") await setInactive(pawn, { reason: "maestro-unconscious" });
  }
}

export async function setControlled(pawn) {
  await removeModuleEffect(pawn, "inactive-pawn");
  await pawn.setFlag(MODULE_ID, "pawn.state", "controlled");
  await rotateToken(pawn, 0);
  drawTether(pawn);
}

export async function setInactive(pawn) {
  if (!pawn.itemTypes.effect?.some((e) => e.slug === "inactive-pawn")) {
    await createModuleEffect(pawn, "inactive-pawn");
  }
  await pawn.setFlag(MODULE_ID, "pawn.state", "inactive");
  await rotateToken(pawn, 90);
  removeTether(pawn);
}

async function addBroken(pawn) {
  if (!pawn.itemTypes.effect?.some((e) => e.slug === "broken-pawn")) {
    await createModuleEffect(pawn, "broken-pawn");
  }
  const flags = pawn.getFlag(MODULE_ID, "pawn") ?? {};
  const history = [...(flags.brokenHistory ?? []), game.time.worldTime];
  await pawn.setFlag(MODULE_ID, "pawn.brokenHistory", history);

  const recent = history.filter((t) => game.time.worldTime - t <= BROKEN_WINDOW_SECONDS);
  if (recent.length >= 2) await setDestroyed(pawn);
}

export async function setDestroyed(pawn) {
  await pawn.setFlag(MODULE_ID, "pawn.state", "destroyed");
  removeTether(pawn);

  const token = pawn.getActiveTokens()[0];
  if (token) await token.document.delete();

  await replacePackedPawnWithRemains(pawn);

  const folder = await ensureDestroyedFolder();
  await pawn.update({ name: `${pawn.name} (Destroyed)`, folder: folder?.id ?? null });
}

async function ensureDestroyedFolder() {
  let parent = game.folders.find((f) => f.type === "Actor" && f.name === "Maestro Pawns" && !f.folder);
  if (!parent) parent = await Folder.create({ name: "Maestro Pawns", type: "Actor" });
  let destroyed = game.folders.find((f) => f.type === "Actor" && f.name === "Destroyed" && f.folder?.id === parent.id);
  if (!destroyed) destroyed = await Folder.create({ name: "Destroyed", type: "Actor", folder: parent.id });
  return destroyed;
}

async function rotateToken(pawn, rotation) {
  const token = pawn.getActiveTokens()[0];
  if (token) await token.document.update({ rotation });
}

async function createModuleEffect(actor, slug) {
  const pack = game.packs.get(`${MODULE_ID}.maestro-effects`);
  const index = await pack.getIndex({ fields: ["system.slug"] });
  const entry = index.find((e) => e.system?.slug === slug);
  if (!entry) return null;
  const source = await pack.getDocument(entry._id);
  const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
  return created;
}

async function removeModuleEffect(actor, slug) {
  const effect = actor.itemTypes.effect?.find((e) => e.slug === slug);
  if (effect) await effect.delete();
}
