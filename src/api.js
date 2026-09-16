import { createPawn } from "./pawns/create-pawn.js";
import { packPawn, unpackPawn } from "./pawns/packing.js";
import { applyFatebound } from "./pawns/lifecycle.js";
import { projectMaestro } from "./link/link-service.js";
import { takeControl } from "./actions/take-control.js";
import { releaseControl } from "./actions/release-control.js";
import { switchForm } from "./actions/switch-form.js";

export function buildApi() {
  return {
    createPawn,
    projectMaestro,
    packPawn,
    unpackPawn,
    applyFatebound,
    actions: { takeControl, releaseControl, switchForm },
  };
}
