import { MODULE_ID } from "../config.js";
import { pawnAbilityMods } from "../rules/pawn-stats.js";
import { buildCraftLinkRules, buildLinkItemRules, buildPawnUpdate, rulesEqual } from "./projection.js";
import { buildFeatureLinkRules } from "./feature-map.js";

const LINK_EFFECT_NAME = "Maestro Link";
const DEBOUNCE_MS = 100;

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const pending = new Map();

export function registerLinkService() {
  Hooks.on("updateActor", (actor) => queueProjection(actor));
  Hooks.on("createItem", (item) => queueProjection(item.actor));
  Hooks.on("updateItem", (item) => queueProjection(item.actor));
  Hooks.on("deleteItem", (item) => queueProjection(item.actor));
  Hooks.once("ready", () => {
    for (const actor of game.actors) {
      if (isMaestro(actor)) queueProjection(actor);
    }
  });
}

function isMaestro(actor) {
  return actor?.type === "character" && actor.items.some((i) => i.type === "class" && i.slug === "maestro");
}

function queueProjection(actor) {
  if (!isMaestro(actor)) return;
  const existing = pending.get(actor.uuid);
  if (existing) clearTimeout(existing);
  pending.set(
    actor.uuid,
    setTimeout(() => {
      pending.delete(actor.uuid);
      projectMaestro(actor).catch((err) => console.error(`${MODULE_ID} |`, err));
    }, DEBOUNCE_MS),
  );
}

/**
 * Only the active GM writes cross-actor pawn state, falling back to the pawn's owner
 * when no GM is connected (CLAUDE.md "One writer").
 */
function isActiveWriter(pawn) {
  if (game.users.activeGM) return game.users.activeGM.isSelf;
  return pawn.isOwner;
}

export async function projectMaestro(maestro) {
  const snapshot = buildMaestroSnapshot(maestro);
  const pawnUuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  for (const uuid of pawnUuids) {
    const pawn = await fromUuid(uuid);
    if (!pawn || !isActiveWriter(pawn)) continue;
    await projectPawn(pawn, snapshot);
  }
}

/** @param {Actor} maestro */
function buildMaestroSnapshot(maestro) {
  const level = maestro.system.details.level.value;
  const intMod = maestro.system.abilities.int.mod;
  const wisMod = maestro.system.abilities.wis.mod;
  const chaMod = maestro.system.abilities.cha.mod;
  // (verify) the roll option Manual Might toggles; see DESIGN.md §6.2.
  const manualMight = !!maestro.rollOptions?.all?.["manual-might"];
  const { armorPotency, resilientRank } = readArmorRunes(maestro);
  const { weaponPotency, strikingRank, propertyRunes } = readInvestedWeaponRunes(maestro);
  const skills = readSkills(maestro);
  const featureSlugs = maestro.itemTypes.feat?.map((i) => i.slug) ?? [];
  return {
    level,
    intMod,
    wisMod,
    chaMod,
    manualMight,
    armorPotency,
    resilientRank,
    weaponPotency,
    strikingRank,
    propertyRunes,
    skills,
    featureSlugs,
  };
}

/** (verify) field paths against the installed systems/pf2e source (DESIGN.md §4.3). */
function readArmorRunes(maestro) {
  const armor = maestro.wornArmor ?? null;
  return {
    armorPotency: armor?.system?.runes?.potency ?? 0,
    resilientRank: armor?.system?.runes?.resilient ?? 0,
  };
}

/**
 * Weapon runes are shared only while the invested weapon is held (Q9's default), or from
 * invested handwraps of mighty blows. (verify) slugs and the runes schema.
 */
function readInvestedWeaponRunes(maestro) {
  const handwraps = maestro.itemTypes.equipment?.find((i) => i.slug === "handwraps-of-mighty-blows" && i.isInvested);
  const heldWeapon = maestro.itemTypes.weapon?.find((w) => w.isInvested && w.isHeld);
  const source = handwraps ?? heldWeapon;
  if (!source) return { weaponPotency: 0, strikingRank: 0, propertyRunes: [] };
  const runes = source.system?.runes ?? {};
  return {
    weaponPotency: runes.potency ?? 0,
    strikingRank: runes.striking ?? 0,
    propertyRunes: (runes.property ?? []).map((r) => r?.slug ?? r),
  };
}

/** Trained-or-better skills and their item bonuses. (verify) the derived-data shape. */
function readSkills(maestro) {
  const skills = maestro.skills ?? {};
  return Object.entries(skills)
    .map(([slug, skill]) => ({
      slug,
      rank: skill.rank ?? 0,
      itemBonus: skill.modifiers?.find((m) => m.type === "item")?.value ?? 0,
    }))
    .filter((s) => s.rank > 0 || s.itemBonus > 0);
}

async function projectPawn(pawn, maestroSnapshot) {
  const pawnFlags = pawn.getFlag(MODULE_ID, "pawn") ?? {};
  const size = pawnFlags.size ?? "sm";
  const metal = pawnFlags.elements?.physical === "metal";

  const abilities = pawnAbilityMods({
    intMod: maestroSnapshot.intMod,
    wisMod: maestroSnapshot.wisMod,
    chaMod: maestroSnapshot.chaMod,
    manualMight: maestroSnapshot.manualMight,
    size,
  });

  await pawn.update(buildPawnUpdate({ level: maestroSnapshot.level, abilities }));

  const rules = [
    ...buildLinkItemRules({
      intMod: abilities.int,
      armorPotency: maestroSnapshot.armorPotency,
      metal,
      resilientRank: maestroSnapshot.resilientRank,
      skills: maestroSnapshot.skills,
      weaponPotency: maestroSnapshot.weaponPotency,
      strikingRank: maestroSnapshot.strikingRank,
      propertyRunes: maestroSnapshot.propertyRunes,
      size,
    }),
    ...buildCraftLinkRules({
      craft: pawnFlags.craft ?? null,
      elements: pawnFlags.elements ?? null,
      form: pawnFlags.form ?? null,
      level: maestroSnapshot.level,
    }),
    ...buildFeatureLinkRules({ featureSlugs: maestroSnapshot.featureSlugs }),
  ];

  const existing = pawn.itemTypes.effect?.find((e) => e.name === LINK_EFFECT_NAME);
  if (existing) {
    if (!rulesEqual(existing.system.rules, rules)) await existing.update({ "system.rules": rules });
    return;
  }
  await pawn.createEmbeddedDocuments("Item", [buildLinkEffectSource(rules)]);
}

function buildLinkEffectSource(rules) {
  return {
    name: LINK_EFFECT_NAME,
    type: "effect",
    img: "icons/svg/paralysis.svg",
    system: {
      rules,
      description: { value: "" },
      duration: { value: -1, unit: "unlimited", expiry: null, sustained: false },
      tokenIcon: { show: false },
      unidentified: true,
    },
  };
}
