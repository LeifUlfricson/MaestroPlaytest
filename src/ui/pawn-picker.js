/**
 * A checkbox dialog for choosing among a set of pawns (DESIGN.md's "prefer PF2e/ApplicationV2
 * dialogs" convention). Returns the chosen pawns, or null if the dialog was cancelled/closed.
 * @param {Actor[]} pawns
 * @param {{title?: string, hint?: string}} [options]
 * @returns {Promise<Actor[]|null>}
 */
export async function pickPawns(pawns, { title, hint } = {}) {
  if (!pawns.length) return [];

  const options = pawns
    .map((p) => `<label style="display:block"><input type="checkbox" name="${p.id}"> ${p.name}</label>`)
    .join("");

  return foundry.applications.api.DialogV2.wait({
    window: { title: title ?? "Choose Pawns" },
    content: `<form>${hint ? `<p>${hint}</p>` : ""}${options}</form>`,
    buttons: [
      {
        action: "ok",
        label: "Confirm",
        default: true,
        callback: (_event, button) => pawns.filter((p) => button.form.elements[p.id]?.checked),
      },
      { action: "cancel", label: "Cancel", callback: () => null },
    ],
    rejectClose: false,
  });
}
