import { createPawn } from "./pawns/create-pawn.js";
import { projectMaestro } from "./link/link-service.js";

export function buildApi() {
  return { createPawn, projectMaestro };
}
