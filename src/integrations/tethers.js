import { MODULE_ID, SETTINGS } from "../config.js";

/** @type {Map<string, PIXI.Graphics>} pawn UUID -> the simple-mode line drawn for it. */
const lines = new Map();

/** (verify) the JB2A asset name; swap for whatever tether visual the table prefers. */
const SEQUENCER_EFFECT_FILE = "jb2a.energy_strands.range.standard.white.01";

/**
 * DESIGN.md §5.11: "Simple mode" draws a PIXI line refreshed on refreshToken; "Sequencer mode"
 * uses a persistent named Sequencer effect instead, when the optional Sequencer module is
 * active (CLAUDE.md "optional integrations are optional" — this degrades to simple otherwise).
 */
export function registerTethers() {
  Hooks.on("refreshToken", () => redrawAllSimple());
}

export function drawTether(pawn) {
  const mode = effectiveTetherMode();
  if (mode === "off") return;
  if (mode === "sequencer") {
    drawSequencerTether(pawn).catch((err) => console.error(`${MODULE_ID} |`, err));
    return;
  }
  redrawOne(pawn).catch((err) => console.error(`${MODULE_ID} |`, err));
}

export function removeTether(pawn) {
  removeSimpleTether(pawn);
  removeSequencerTether(pawn);
}

function effectiveTetherMode() {
  const setting = game.settings.get(MODULE_ID, SETTINGS.TETHERS);
  if (setting === "sequencer" && !game.modules.get("sequencer")?.active) return "simple";
  return setting;
}

// ---------------------------------------------------------------------------
// Simple mode: a PIXI line on the tokens layer.
// ---------------------------------------------------------------------------

function removeSimpleTether(pawn) {
  const line = lines.get(pawn.uuid);
  if (line) {
    line.destroy();
    lines.delete(pawn.uuid);
  }
}

function redrawAllSimple() {
  for (const uuid of lines.keys()) {
    fromUuid(uuid).then((pawn) => pawn && redrawOne(pawn));
  }
}

async function redrawOne(pawn) {
  const maestroUuid = pawn.getFlag(MODULE_ID, "pawn")?.maestroUuid;
  const maestro = maestroUuid ? await fromUuid(maestroUuid) : null;
  const maestroToken = maestro?.getActiveTokens()[0];
  const pawnToken = pawn.getActiveTokens()[0];
  if (!maestroToken || !pawnToken) {
    removeSimpleTether(pawn);
    return;
  }

  let line = lines.get(pawn.uuid);
  if (!line) {
    line = new PIXI.Graphics();
    canvas.tokens.addChild(line);
    lines.set(pawn.uuid, line);
  }
  line.clear();
  line.lineStyle(2, 0x66ccff, 0.8);
  line.moveTo(maestroToken.center.x, maestroToken.center.y);
  line.lineTo(pawnToken.center.x, pawnToken.center.y);
}

// ---------------------------------------------------------------------------
// Sequencer mode: a persistent named effect between the two tokens.
// ---------------------------------------------------------------------------

function sequencerTetherName(pawn) {
  return `maestro-tether-${pawn.id}`;
}

async function drawSequencerTether(pawn) {
  const maestroUuid = pawn.getFlag(MODULE_ID, "pawn")?.maestroUuid;
  const maestro = maestroUuid ? await fromUuid(maestroUuid) : null;
  const maestroToken = maestro?.getActiveTokens()[0];
  const pawnToken = pawn.getActiveTokens()[0];
  if (!maestroToken || !pawnToken) return;

  removeSequencerTether(pawn);
  new Sequence()
    .effect()
    .file(SEQUENCER_EFFECT_FILE)
    .attachTo(pawnToken)
    .stretchTo(maestroToken, { attachTo: true })
    .persist()
    .name(sequencerTetherName(pawn))
    .play();
}

function removeSequencerTether(pawn) {
  if (game.modules.get("sequencer")?.active) {
    Sequencer.EffectManager.endEffects({ name: sequencerTetherName(pawn) });
  }
}
