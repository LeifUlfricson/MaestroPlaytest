import { takeControl } from "../actions/take-control.js";
import { releaseControl } from "../actions/release-control.js";
import { switchForm } from "../actions/switch-form.js";
import { advance } from "../actions/advance.js";
import { coordinatedStrike } from "../actions/coordinated-strike.js";
import { castRapidAssembly } from "../spells/cast-rapid-assembly.js";
import { castElementalFont } from "../spells/cast-elemental-font.js";
import { castPuppetsCurse } from "../spells/cast-puppets-curse.js";
import { castSacrificePawn } from "../spells/cast-sacrifice-pawn.js";
import { castProjectSenses } from "../spells/cast-project-senses.js";
import { castHoldTogether } from "../spells/cast-hold-together.js";
import { castBloodOfTheMaster } from "../spells/cast-blood-of-the-master.js";
import { castSpatialSurge } from "../spells/cast-spatial-surge.js";
import { castBlitz } from "../spells/cast-blitz.js";

const HANDLERS = {
  "take-control": takeControl,
  "release-control": releaseControl,
  "switch-form": switchForm,
  advance,
  "coordinated-strike": coordinatedStrike,
  "rapid-assembly": castRapidAssembly,
  "elemental-font": castElementalFont,
  "puppets-curse": castPuppetsCurse,
  "sacrifice-pawn": castSacrificePawn,
  "project-senses": castProjectSenses,
  "hold-together": castHoldTogether,
  "blood-of-the-master": castBloodOfTheMaster,
  "spatial-surge": castSpatialSurge,
  blitz: castBlitz,
};

/**
 * DESIGN.md's Decision D7: action items (and, for the command spells, the spell's own cast
 * card) post their normal PF2e chat card, and this hook adds an Execute button when the card's
 * origin item slug is one the module handles.
 * (verify) ChatMessage#item and the renderChatMessageHTML hook name against the installed system.
 */
export function registerExecuteButton() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const slug = message.item?.slug;
    const handler = slug && HANDLERS[slug];
    const actor = message.actor;
    if (!handler || !actor) return;

    const root = html instanceof HTMLElement ? html : html[0];
    const content = root?.querySelector(".message-content") ?? root;
    if (!content) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maestro-execute";
    button.textContent = "Execute";
    button.addEventListener("click", () => handler(actor));
    content.appendChild(button);
  });
}
