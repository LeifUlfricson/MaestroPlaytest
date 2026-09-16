import { takeControl } from "../actions/take-control.js";
import { releaseControl } from "../actions/release-control.js";
import { switchForm } from "../actions/switch-form.js";

const HANDLERS = {
  "take-control": takeControl,
  "release-control": releaseControl,
  "switch-form": switchForm,
};

/**
 * DESIGN.md's Decision D7: action items post their normal PF2e chat card, and this hook adds
 * an Execute button when the card's origin item slug is one the module handles.
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
