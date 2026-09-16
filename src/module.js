import { MODULE_ID } from "./config.js";
import { registerSettings } from "./settings.js";
import { registerLinkService } from "./link/link-service.js";
import { registerLifecycleHooks } from "./pawns/lifecycle.js";
import { registerRangeWatcher } from "./pawns/range.js";
import { registerGroupTactics } from "./pawns/group-tactics.js";
import { registerTethers } from "./integrations/tethers.js";
import { registerFocusEntry } from "./spells/focus-entry.js";
import { registerSpellGrants } from "./spells/grant-spells.js";
import { registerRapidAssemblyExpiry } from "./spells/cast-rapid-assembly.js";
import { createPawn } from "./pawns/create-pawn.js";
import { registerExecuteButton } from "./ui/execute-button.js";
import { registerTokenHud } from "./ui/token-hud.js";
import { registerActionTracker } from "./ui/action-tracker.js";
import { buildApi } from "./api.js";

Hooks.once("init", () => {
  registerSettings();
  registerLinkService();
  registerLifecycleHooks();
  registerRangeWatcher();
  registerGroupTactics();
  registerTethers();
  registerFocusEntry();
  registerSpellGrants();
  registerRapidAssemblyExpiry();
  registerExecuteButton();
  registerTokenHud();
  registerActionTracker();
  game.modules.get(MODULE_ID).api = buildApi();
});

/**
 * A "Create Pawn" header button on a maestro's sheet (DESIGN.md §5.1). (verify) against the
 * installed PF2e system: v14's ApplicationV2 character sheet may need a different hook than
 * this AppV1-style one.
 */
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  const actor = sheet.actor;
  if (actor?.type !== "character") return;
  if (!actor.items.some((i) => i.type === "class" && i.slug === "maestro")) return;
  buttons.unshift({
    label: "Create Pawn",
    class: "maestro-create-pawn",
    icon: "fa-solid fa-robot",
    onclick: () => createPawn(actor),
  });
});
