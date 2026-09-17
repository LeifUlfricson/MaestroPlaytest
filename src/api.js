import { createPawn } from "./pawns/create-pawn.js";
import { packPawn, unpackPawn } from "./pawns/packing.js";
import { applyFatebound } from "./pawns/lifecycle.js";
import { projectMaestro } from "./link/link-service.js";
import { takeControl } from "./actions/take-control.js";
import { releaseControl } from "./actions/release-control.js";
import { advance } from "./actions/advance.js";
import { coordinatedStrike } from "./actions/coordinated-strike.js";
import { castRapidAssembly } from "./spells/cast-rapid-assembly.js";
import { castElementalFont } from "./spells/cast-elemental-font.js";
import { castPuppetsCurse } from "./spells/cast-puppets-curse.js";
import { castSacrificePawn } from "./spells/cast-sacrifice-pawn.js";
import { castProjectSenses } from "./spells/cast-project-senses.js";
import { castHoldTogether } from "./spells/cast-hold-together.js";
import { castBloodOfTheMaster } from "./spells/cast-blood-of-the-master.js";
import { castSpatialSurge } from "./spells/cast-spatial-surge.js";
import { castBlitz } from "./spells/cast-blitz.js";

export function buildApi() {
  return {
    createPawn,
    projectMaestro,
    packPawn,
    unpackPawn,
    applyFatebound,
    actions: {
      takeControl,
      releaseControl,
      advance,
      coordinatedStrike,
      castRapidAssembly,
      castElementalFont,
      castPuppetsCurse,
      castSacrificePawn,
      castProjectSenses,
      castHoldTogether,
      castBloodOfTheMaster,
      castSpatialSurge,
      castBlitz,
    },
  };
}
