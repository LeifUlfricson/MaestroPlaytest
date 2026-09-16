import { createPawn } from "./pawns/create-pawn.js";
import { packPawn, unpackPawn } from "./pawns/packing.js";
import { projectMaestro } from "./link/link-service.js";
import { takeControl } from "./actions/take-control.js";
import { releaseControl } from "./actions/release-control.js";

export function buildApi() {
  return {
    createPawn,
    projectMaestro,
    packPawn,
    unpackPawn,
    actions: { takeControl, releaseControl },
  };
}
