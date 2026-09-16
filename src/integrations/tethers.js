import { MODULE_ID, SETTINGS } from "../config.js";

/** @type {Map<string, PIXI.Graphics>} pawn UUID -> the line drawn for it. */
const lines = new Map();

/** DESIGN.md §5.11 "Simple mode": a PIXI line refreshed on refreshToken. Sequencer mode is M8. */
export function registerTethers() {
  Hooks.on("refreshToken", () => redrawAll());
}

export function drawTether(pawn) {
  if (game.settings.get(MODULE_ID, SETTINGS.TETHERS) !== "simple") return;
  redrawOne(pawn).catch((err) => console.error(`${MODULE_ID} |`, err));
}

export function removeTether(pawn) {
  const line = lines.get(pawn.uuid);
  if (line) {
    line.destroy();
    lines.delete(pawn.uuid);
  }
}

function redrawAll() {
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
    removeTether(pawn);
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
