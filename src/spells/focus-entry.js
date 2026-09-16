const FOCUS_ENTRY_NAME = "Command Spells";

/** Command Spell tradition by Craft (DESIGN.md §2.4/§7). */
const TRADITION_BY_CRAFT = { flesh: "occult", ethereal: "arcane", elemental: "primal", sympathetic: "divine" };

/**
 * DESIGN.md §7: when the maestro's Craft ChoiceSet is answered, code (not an RE) creates the
 * "Command Spells" focus spellcasting entry with the Craft's tradition. Individual command
 * spells are added to this entry by their granting feats/features later (M6).
 */
export function registerFocusEntry() {
  Hooks.on("createItem", (item) => ensureFocusEntry(item));
  Hooks.on("updateItem", (item) => ensureFocusEntry(item));
}

/** (verify) that ChoiceSet stores its selection at flags.pf2e.rulesSelections.<flag>. */
async function ensureFocusEntry(item) {
  const maestro = item.actor;
  if (!maestro || item.slug !== "maestros-craft") return;

  const craft = item.flags?.pf2e?.rulesSelections?.craft;
  const tradition = TRADITION_BY_CRAFT[craft];
  if (!tradition) return;

  if (maestro.itemTypes.spellcastingEntry?.some((e) => e.name === FOCUS_ENTRY_NAME)) return;

  await maestro.createEmbeddedDocuments("Item", [
    {
      name: FOCUS_ENTRY_NAME,
      type: "spellcastingEntry",
      img: "icons/svg/daze.svg",
      system: {
        prepared: { value: "focus" },
        tradition: { value: tradition },
        ability: { value: "int" },
        proficiency: { value: 1 },
        showSlotlessLevels: { value: false },
      },
    },
  ]);
}
