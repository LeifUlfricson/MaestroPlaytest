import { MODULE_ID } from "../config.js";
import { createModuleEffect, removeModuleEffect } from "../util/module-effects.js";
import { setControlled } from "../pawns/lifecycle.js";
import { unpackPawn } from "../pawns/packing.js";

/**
 * DESIGN.md §7 "Blood of the Master": spend HP, distribute it evenly across the chosen Flesh
 * pawns (an Assist-tier simplification of the "distribute however you wish" grid), heal them,
 * remove Broken, and Take Control of any Inactive recipients.
 * @param {Actor} maestro
 */
export async function castBloodOfTheMaster(maestro) {
  const uuids = maestro.getFlag(MODULE_ID, "maestro")?.pawnUuids ?? [];
  const pawns = (await Promise.all(uuids.map((u) => fromUuid(u)))).filter(
    (p) => p?.getFlag(MODULE_ID, "pawn")?.craft === "flesh" && p.getFlag(MODULE_ID, "pawn")?.state !== "destroyed",
  );

  if (!pawns.length) {
    ui.notifications.info(game.i18n.format("PF2E_MAESTRO.UI.BloodOfTheMaster.NoneEligible", { name: maestro.name }));
    return;
  }

  const currentHP = maestro.system.attributes.hp.value;
  const answers = await promptForSpend(maestro, pawns, currentHP);
  if (!answers) return;

  await maestro.update({ "system.attributes.hp.value": currentHP - answers.spend });

  const share = Math.floor(answers.spend / answers.targets.length);
  for (const pawn of answers.targets) {
    const hp = pawn.system.attributes.hp;
    await pawn.update({ "system.attributes.hp.value": Math.min(hp.max, hp.value + share) });
    await removeModuleEffect(pawn, "broken-pawn");

    if (pawn.getFlag(MODULE_ID, "pawn")?.state === "inactive") {
      if (pawn.getFlag(MODULE_ID, "pawn")?.packed) await unpackPawn(pawn, maestro);
      await setControlled(pawn);
    }

    if (share >= 10) {
      await removeModuleEffect(pawn, "blood-of-the-master-damage");
      await createModuleEffect(pawn, "blood-of-the-master-damage");
    }
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: maestro }),
    content: `<p>${maestro.name} loses ${answers.spend} Hit Points to heal ${answers.targets.map((p) => p.name).join(", ")} (${share} each).</p>`,
  });
}

async function promptForSpend(maestro, pawns, currentHP) {
  const options = pawns
    .map((p) => `<label style="display:block"><input type="checkbox" name="${p.id}"> ${p.name}</label>`)
    .join("");

  return foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("PF2E_MAESTRO.UI.BloodOfTheMaster.Title") },
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.format("PF2E_MAESTRO.UI.BloodOfTheMaster.SpendLabel", { max: currentHP - 1 })}</label>
          <input type="number" name="spend" value="1" min="1" max="${currentHP - 1}">
        </div>
        ${options}
      </form>
    `,
    ok: {
      label: game.i18n.localize("PF2E_MAESTRO.UI.BloodOfTheMaster.Confirm"),
      callback: (_event, button) => {
        const spend = Number(button.form.elements.spend.value);
        const targets = pawns.filter((p) => button.form.elements[p.id]?.checked);
        if (!spend || spend < 1 || spend > currentHP - 1 || !targets.length) return null;
        return { spend, targets };
      },
    },
    rejectClose: false,
  });
}
