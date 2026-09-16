import { MODULE_ID } from "../config.js";
import { createModuleEffect } from "../util/module-effects.js";

const MELEE_REACH_FT = 5;

/**
 * DESIGN.md §5.6, spike option B (the default): a marker effect, "Group Tactics (Target)",
 * applied to any enemy within melee reach of 2+ of {the maestro, their Controlled pawns}.
 *
 * (verify), and a known gap: this only maintains the marker effect and its
 * maestro-group-tactics:<id> roll option. It does NOT yet grant off-guard against that
 * maestro's attacks (DESIGN.md's EphemeralEffect step), because that needs the core PF2e
 * off-guard condition's UUID, which this environment has no way to look up (the same DESIGN.md
 * Q11 "stop and ask, don't invent an ID" situation as Stitched Together in M4). Until that's
 * filled in, the GM applies off-guard by hand when this effect is present.
 */
export function registerGroupTactics() {
  Hooks.on("updateToken", (tokenDoc, changed) => {
    if (!("x" in changed || "y" in changed || "elevation" in changed)) return;
    refreshScene(tokenDoc.parent).catch((err) => console.error(`${MODULE_ID} |`, err));
  });
  Hooks.on("combatTurnChange", (combat) => {
    refreshScene(combat.scene).catch((err) => console.error(`${MODULE_ID} |`, err));
  });
}

async function refreshScene(scene) {
  if (!scene) return;
  const maestroTokens = scene.tokens.filter(
    (t) =>
      t.actor?.items.some((i) => i.type === "class" && i.slug === "maestro") &&
      t.actor.items.some((i) => i.slug === "group-tactics"),
  );
  for (const maestroToken of maestroTokens) {
    await refreshForMaestro(maestroToken);
  }
}

async function refreshForMaestro(maestroToken) {
  const maestro = maestroToken.actor;
  const scene = maestroToken.parent;
  const pawnUuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];

  const attackerTokens = [maestroToken.object].filter(Boolean);
  for (const uuid of pawnUuids) {
    const pawn = await fromUuid(uuid);
    if (pawn?.getFlag(MODULE_ID, "pawn")?.state !== "controlled") continue;
    const token = pawn.getActiveTokens().find((t) => t.scene?.id === scene.id);
    if (token) attackerTokens.push(token);
  }
  if (!attackerTokens.length) return;

  for (const targetTokenDoc of scene.tokens) {
    if (!targetTokenDoc.actor || targetTokenDoc.disposition === maestroToken.disposition) continue;
    const targetToken = targetTokenDoc.object;
    if (!targetToken) continue;
    const nearby = attackerTokens.filter((t) => t.distanceTo(targetToken) <= MELEE_REACH_FT);
    await syncMarker(targetTokenDoc.actor, maestro, nearby.length >= 2);
  }
}

async function syncMarker(targetActor, maestro, qualifies) {
  const existing = targetActor.itemTypes.effect?.find(
    (e) => e.slug === "group-tactics-target" && e.getFlag(MODULE_ID, "maestroUuid") === maestro.uuid,
  );
  if (qualifies && !existing) {
    const created = await createModuleEffect(targetActor, "group-tactics-target");
    if (!created) return;
    await created.setFlag(MODULE_ID, "maestroUuid", maestro.uuid);
    await created.update({ "system.rules": [{ key: "RollOption", domain: "all", option: `maestro-group-tactics:${maestro.id}` }] });
  } else if (!qualifies && existing) {
    await existing.delete();
  }
}
