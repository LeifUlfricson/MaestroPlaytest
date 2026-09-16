const FOCUS_ENTRY_NAME = "Command Spells";

/** Command Spell tradition by Craft (DESIGN.md §2.4/§7). */
const TRADITION_BY_CRAFT = { flesh: "occult", ethereal: "arcane", elemental: "primal", sympathetic: "divine" };

/**
 * Serializes ensureFocusEntry per maestro UUID. PF2e's ChoiceSet resolution can fire updateItem
 * on "maestros-craft" more than once in quick succession (e.g. the craft flag and its derived
 * roll options land in separate updates); without a lock, two overlapping calls both see no
 * "Command Spells" entry yet and both create one, leaving a duplicate. Same race shape as
 * link-service.js's pawnLocks, found there first via live testing.
 * @type {Map<string, Promise<void>>}
 */
const maestroLocks = new Map();

/**
 * DESIGN.md §7: when the maestro's Craft ChoiceSet is answered, code (not an RE) creates the
 * "Command Spells" focus spellcasting entry with the Craft's tradition. Individual command
 * spells are added to this entry by their granting feats/features later (M6).
 */
export function registerFocusEntry() {
  Hooks.on("createItem", (item) => queueEnsureFocusEntry(item));
  Hooks.on("updateItem", (item) => queueEnsureFocusEntry(item));
}

function queueEnsureFocusEntry(item) {
  const maestro = item.actor;
  if (!maestro) return;
  const prior = maestroLocks.get(maestro.uuid) ?? Promise.resolve();
  const next = prior.then(() => ensureFocusEntry(item, maestro));
  maestroLocks.set(
    maestro.uuid,
    next.catch(() => {}),
  );
}

/** (verify) that ChoiceSet stores its selection at flags.pf2e.rulesSelections.<flag>. */
async function ensureFocusEntry(item, maestro) {
  if (item.slug !== "maestros-craft") return;

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
