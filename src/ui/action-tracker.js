import { MODULE_ID, SETTINGS } from "../config.js";

/**
 * DESIGN.md §5.7: a client-side HUD counter for the shared multiple attack penalty step,
 * which resets when the maestro's turn starts. A minimal version for now (no reaction marker
 * yet); DESIGN.md's own Decision D5 treats this as a manual aid, not a source of truth.
 * (verify) ApplicationV2's _renderHTML/_replaceHTML signature and the combatTurnChange hook.
 */
let mapStep = 0;
let hud = null;

export function registerActionTracker() {
  Hooks.once("ready", () => {
    if (game.settings.get(MODULE_ID, SETTINGS.SHOW_ACTION_TRACKER) && findOwnedMaestro()) showHud();
  });

  Hooks.on("combatTurnChange", (combat) => {
    const combatant = combat.combatant;
    if (combatant?.actor?.isOwner && isMaestro(combatant.actor)) {
      mapStep = 0;
      hud?.render();
    }
  });
}

function isMaestro(actor) {
  return actor?.items.some((i) => i.type === "class" && i.slug === "maestro");
}

function findOwnedMaestro() {
  return game.actors.find((a) => a.isOwner && isMaestro(a));
}

function showHud() {
  hud ??= new ActionTrackerHud();
  hud.render(true);
}

class ActionTrackerHud extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "maestro-action-tracker",
    window: { title: "Maestro", minimizable: true, resizable: false },
    position: { width: 200, height: "auto" },
  };

  async _renderHTML() {
    return `
      <div style="padding: 4px 8px;">
        <p style="margin: 0 0 4px;">MAP step: <strong>${mapStep}</strong></p>
        <button type="button" data-action="increment">+1</button>
        <button type="button" data-action="reset">Reset</button>
      </div>
    `;
  }

  async _replaceHTML(result, content) {
    content.innerHTML = result;
    content.querySelector('[data-action="increment"]')?.addEventListener("click", () => {
      mapStep = Math.min(mapStep + 1, 2);
      this.render();
    });
    content.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
      mapStep = 0;
      this.render();
    });
  }
}
