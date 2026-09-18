import { MODULE_ID } from "./config.js";
import { registerSettings } from "./settings.js";
import { registerLinkService } from "./link/link-service.js";
import { registerLifecycleHooks } from "./pawns/lifecycle.js";
import { registerRangeWatcher } from "./pawns/range.js";
import { registerGroupTactics } from "./pawns/group-tactics.js";
import { registerSchematics } from "./pawns/schematics.js";
import { registerTethers } from "./integrations/tethers.js";
import { registerFocusEntry } from "./spells/focus-entry.js";
import { registerSpellGrants } from "./spells/grant-spells.js";
import { registerRapidAssemblyExpiry } from "./spells/cast-rapid-assembly.js";
import { createPawn } from "./pawns/create-pawn.js";
import { registerExecuteButton } from "./ui/execute-button.js";
import { registerTokenHud } from "./ui/token-hud.js";
import { buildApi } from "./api.js";

Hooks.once("init", () => {
  registerSettings();
  registerLinkService();
  registerLifecycleHooks();
  registerRangeWatcher();
  registerGroupTactics();
  registerSchematics();
  registerTethers();
  registerFocusEntry();
  registerSpellGrants();
  registerRapidAssemblyExpiry();
  registerExecuteButton();
  registerTokenHud();
  game.modules.get(MODULE_ID).api = buildApi();
});

/**
 * A "Create Pawn" header button on a maestro's sheet (DESIGN.md §5.1). `getActorSheetHeaderButtons`
 * never fires on v14's ApplicationV2 character sheet (confirmed live), so this uses the same
 * `renderActorSheet` + direct DOM insertion approach as schematics.js's "Install Schematic"
 * button, which is confirmed working on that same sheet class.
 */
Hooks.on("renderActorSheet", (sheet, html) => {
  const actor = sheet.actor;
  if (actor?.type !== "character") return;
  if (!actor.items.some((i) => i.type === "class" && i.slug === "maestro")) return;
  addCreatePawnButton(sheet, html, actor);
});

function addCreatePawnButton(sheet, html, actor) {
  const root = html instanceof HTMLElement ? html : html[0];
  const header = root?.querySelector(".window-header .window-title")?.parentElement;
  if (!header || header.querySelector(".maestro-create-pawn")) return;

  const button = document.createElement("a");
  button.className = "maestro-create-pawn";
  button.innerHTML = `<i class="fa-solid fa-robot"></i> ${game.i18n.localize("PF2E_MAESTRO.UI.CreatePawn.Title")}`;
  button.addEventListener("click", () => createPawn(actor));
  header.appendChild(button);
}
