import { MODULE_ID } from "../config.js";
import { pawnBulk } from "../rules/progression.js";

/** DESIGN.md §5.3 "Pack": only if Inactive and adjacent (adjacency is enforced by the HUD/UI caller). */
export async function packPawn(pawn) {
  const state = pawn.getFlag(MODULE_ID, "pawn")?.state;
  if (state !== "inactive") {
    ui.notifications.warn(`${pawn.name} must be Inactive before it can be packed.`);
    return;
  }
  const token = pawn.getActiveTokens()[0];
  if (token) await token.document.delete();
  await pawn.setFlag(MODULE_ID, "pawn.packed", true);
  await ensurePackedPawnItem(pawn);
}

/** DESIGN.md §5.3 "Unpack": happens through Take Control (src/actions/take-control.js). */
export async function unpackPawn(pawn, maestro, position) {
  await pawn.setFlag(MODULE_ID, "pawn.packed", false);
  await placeToken(pawn, maestro, position);
}

async function ensurePackedPawnItem(pawn) {
  const maestro = await maestroOf(pawn);
  if (!maestro) return null;
  const existing = findPackedPawnItem(maestro, pawn);
  if (existing) return existing;

  const size = pawn.getFlag(MODULE_ID, "pawn")?.size ?? "sm";
  const [created] = await maestro.createEmbeddedDocuments("Item", [
    {
      name: `Packed Pawn: ${pawn.name}`,
      type: "equipment",
      img: pawn.img,
      system: {
        bulk: { value: pawnBulk({ size }) },
        description: { value: `<p>@UUID[${pawn.uuid}]{${pawn.name}}</p>` },
        traits: { value: ["pawn"], rarity: "common" },
      },
      flags: { [MODULE_ID]: { pawnUuid: pawn.uuid } },
    },
  ]);
  return created;
}

/** DESIGN.md §5.2 Destroyed: replace the Packed Pawn item with a Pawn Remains loot item, same Bulk. */
export async function replacePackedPawnWithRemains(pawn) {
  const maestro = await maestroOf(pawn);
  if (!maestro) return;

  const packedItem = findPackedPawnItem(maestro, pawn);
  const bulk = packedItem?.system?.bulk?.value ?? pawnBulk({ size: pawn.getFlag(MODULE_ID, "pawn")?.size ?? "sm" });
  if (packedItem) await packedItem.delete();

  await maestro.createEmbeddedDocuments("Item", [
    {
      name: `Pawn Remains: ${pawn.name}`,
      type: "loot",
      img: pawn.img,
      system: {
        bulk: { value: bulk },
        description: { value: `<p>The inert remains of ${pawn.name}. Rapid Assembly may target these remains.</p>` },
      },
      flags: { [MODULE_ID]: { pawnUuid: pawn.uuid } },
    },
  ]);
}

async function maestroOf(pawn) {
  const uuid = pawn.getFlag(MODULE_ID, "pawn")?.maestroUuid;
  return uuid ? fromUuid(uuid) : null;
}

function findPackedPawnItem(maestro, pawn) {
  return maestro.itemTypes.equipment?.find((i) => i.getFlag(MODULE_ID, "pawnUuid") === pawn.uuid) ?? null;
}

/** Places the pawn's token adjacent to the maestro. (verify) against Portal's pick() and v14's grid API. */
export async function placeToken(pawn, maestro, position) {
  const maestroToken = maestro.getActiveTokens()[0];
  if (!maestroToken) return;
  const spot = position ?? findAdjacentSpace(maestroToken);
  const tokenDocument = await pawn.getTokenDocument({ x: spot.x, y: spot.y });
  await maestroToken.scene.createEmbeddedDocuments("Token", [tokenDocument.toObject()]);
}

function findAdjacentSpace(maestroToken) {
  const size = canvas.grid.size;
  const offsets = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  for (const [dx, dy] of offsets) {
    const x = maestroToken.x + dx * size;
    const y = maestroToken.y + dy * size;
    if (!canvas.tokens.placeables.some((t) => t.x === x && t.y === y)) return { x, y };
  }
  return { x: maestroToken.x, y: maestroToken.y };
}
