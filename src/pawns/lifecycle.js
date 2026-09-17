import { MODULE_ID, SETTINGS } from "../config.js";
import { sealedFateDice } from "../rules/progression.js";
import { maestroClassDC } from "../rules/pawn-stats.js";
import { drawTether, removeTether } from "../integrations/tethers.js";
import { createModuleEffect, removeModuleEffect } from "../util/module-effects.js";
import { replacePackedPawnWithRemains } from "./packing.js";

const BROKEN_WINDOW_SECONDS = 600;

export function registerLifecycleHooks() {
  Hooks.on("preUpdateActor", (actor, changed, options) => {
    if (!isPawn(actor)) return;
    const newHP = foundry.utils.getProperty(changed, "system.attributes.hp.value");
    if (newHP === undefined) return;
    options.maestroPawnOldHP = actor.system.attributes.hp.value;

    // Hold Together (DESIGN.md §7): intercept before the 0 is ever persisted, so the normal
    // HP-zero transition below never sees it.
    const holdTogether = actor.itemTypes.effect?.find((e) => e.slug === "hold-together");
    if (holdTogether && newHP <= 0) {
      foundry.utils.setProperty(changed, "system.attributes.hp.value", 1);
      options.maestroHoldTogetherConsumed = holdTogether.id;
    }
  });

  Hooks.on("updateActor", (actor, changed, options) => {
    if (!isPawn(actor)) return;
    if (options.maestroHoldTogetherConsumed) {
      actor.items.get(options.maestroHoldTogetherConsumed)?.delete();
    }
    const newHP = foundry.utils.getProperty(changed, "system.attributes.hp.value");
    if (newHP === undefined) return;
    const oldHP = options.maestroPawnOldHP;
    handleHPChange(actor, oldHP, newHP).catch((err) => console.error(`${MODULE_ID} |`, err));
    checkSealedFate(actor, oldHP, newHP).catch((err) => console.error(`${MODULE_ID} |`, err));
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

/**
 * Sympathetic Craft's Sealed Fate (DESIGN.md §6.1): any HP loss on a Sympathetic pawn (Q13:
 * including self-inflicted loss) damages whichever creature is currently fatebound to it.
 * Limited to once per round (V2.2 balance change): gated the same way as the formation lock
 * (src/actions/formation-lock.js), keyed on the maestro since a maestro's Sealed Fate is one
 * ability shared across all of their Sympathetic pawns, not a separate use per pawn. Ignored
 * outside combat, since "round" isn't otherwise defined.
 * (verify) the @Check/@Damage inline-roll syntax against the installed system.
 */
async function checkSealedFate(pawn, oldHP, newHP) {
  if (oldHP === undefined || newHP >= oldHP) return;
  if (!game.settings.get(MODULE_ID, SETTINGS.SEALED_FATE_CARDS)) return;
  const pawnFlags = pawn.getFlag(MODULE_ID, "pawn") ?? {};
  if (pawnFlags.craft !== "sympathetic") return;

  const target = findFateboundBearer(pawn);
  const maestro = pawnFlags.maestroUuid ? await fromUuid(pawnFlags.maestroUuid) : null;
  if (!target || !maestro) return;
  if (isSealedFateUsedThisRound(maestro)) return;

  const level = maestro.system.details.level.value;
  const dice = sealedFateDice(level);
  const classDC = maestroClassDC({ level, intMod: maestro.system.abilities.int.mod });

  await setSealedFateUsedThisRound(maestro);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: pawn }),
    content: `<p><strong>Sealed Fate:</strong> ${target.name} is fatebound to ${pawn.name}.</p><p>@Check[will|dc:${classDC}|basic] against @Damage[${dice}d6[spirit]]</p>`,
  });
}

function isSealedFateUsedThisRound(maestro) {
  if (!game.combat) return false;
  const used = maestro.getFlag(MODULE_ID, "maestro")?.sealedFateUsedRound;
  return used?.combatId === game.combat.id && used?.round === game.combat.round;
}

async function setSealedFateUsedThisRound(maestro) {
  if (!game.combat) return;
  await maestro.setFlag(MODULE_ID, "maestro.sealedFateUsedRound", {
    combatId: game.combat.id,
    round: game.combat.round,
  });
}

/** Finds the actor (anywhere on the current scene) carrying a Fatebound effect from this pawn. */
function findFateboundBearer(pawn) {
  for (const token of canvas?.scene?.tokens ?? []) {
    const actor = token.actor;
    if (actor?.itemTypes.effect?.some((e) => e.slug === "fatebound" && e.getFlag(MODULE_ID, "pawnUuid") === pawn.uuid)) {
      return actor;
    }
  }
  return null;
}

/**
 * Applies Fatebound to a target, removing any other Fatebound effect from the same maestro
 * first (DESIGN.md §6.1: "Only one creature ... can be fatebound at a time").
 * @param {Actor} target
 * @param {Actor} pawn
 */
export async function applyFatebound(target, pawn) {
  const maestroUuid = pawn.getFlag(MODULE_ID, "pawn")?.maestroUuid;
  for (const token of canvas?.scene?.tokens ?? []) {
    const existing = token.actor?.itemTypes.effect?.find(
      (e) => e.slug === "fatebound" && e.getFlag(MODULE_ID, "maestroUuid") === maestroUuid,
    );
    if (existing) await existing.delete();
  }

  const created = await createModuleEffect(target, "fatebound");
  if (created) await created.setFlag(MODULE_ID, "pawnUuid", pawn.uuid).then(() => created.setFlag(MODULE_ID, "maestroUuid", maestroUuid));
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
  await removeFateboundCausedBy(pawn);
}

/** Fatebound "ends automatically ... when the linked pawn becomes Inactive" (DESIGN.md §6.1). */
async function removeFateboundCausedBy(pawn) {
  for (const token of canvas?.scene?.tokens ?? []) {
    const effect = token.actor?.itemTypes.effect?.find(
      (e) => e.slug === "fatebound" && e.getFlag(MODULE_ID, "pawnUuid") === pawn.uuid,
    );
    if (effect) await effect.delete();
  }
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
