import { MODULE_ID } from "../config.js";
import { packPawn } from "../pawns/packing.js";

/** DESIGN.md §5.3 "Pack": an Interact button on the pawn's token HUD. */
export function registerTokenHud() {
  Hooks.on("renderTokenHUD", (hud, html) => {
    const actor = hud.object?.actor;
    if (!actor?.getFlag(MODULE_ID, "pawn")) return;

    const root = html instanceof HTMLElement ? html : html[0];
    const column = root?.querySelector(".col.left");
    if (!column) return;

    const button = document.createElement("div");
    button.className = "control-icon maestro-pack";
    button.title = "Pack";
    button.innerHTML = '<i class="fa-solid fa-box"></i>';
    button.addEventListener("click", () => packPawn(actor));
    column.appendChild(button);
  });
}
