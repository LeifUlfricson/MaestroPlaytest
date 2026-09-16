import { MODULE_ID, SETTINGS } from "./config.js";

/** @param {string} settingKey */
function localize(settingKey) {
  return `PF2E_MAESTRO.Settings.${settingKey}`;
}

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.AUTO_INACTIVE_ON_RANGE, {
    name: `${localize(SETTINGS.AUTO_INACTIVE_ON_RANGE)}.Name`,
    hint: `${localize(SETTINGS.AUTO_INACTIVE_ON_RANGE)}.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.ENFORCE_CONTROL_CAP, {
    name: `${localize(SETTINGS.ENFORCE_CONTROL_CAP)}.Name`,
    hint: `${localize(SETTINGS.ENFORCE_CONTROL_CAP)}.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.FORMATION_LOCK, {
    name: `${localize(SETTINGS.FORMATION_LOCK)}.Name`,
    hint: `${localize(SETTINGS.FORMATION_LOCK)}.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.SEALED_FATE_CARDS, {
    name: `${localize(SETTINGS.SEALED_FATE_CARDS)}.Name`,
    hint: `${localize(SETTINGS.SEALED_FATE_CARDS)}.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.TETHERS, {
    name: `${localize(SETTINGS.TETHERS)}.Name`,
    hint: `${localize(SETTINGS.TETHERS)}.Hint`,
    scope: "world",
    config: true,
    type: String,
    choices: { off: "Off", simple: "Simple", sequencer: "Sequencer" },
    default: game.modules.get("sequencer")?.active ? "sequencer" : "simple",
  });

  game.settings.register(MODULE_ID, SETTINGS.RUNE_SHARING, {
    name: `${localize(SETTINGS.RUNE_SHARING)}.Name`,
    hint: `${localize(SETTINGS.RUNE_SHARING)}.Hint`,
    scope: "world",
    config: true,
    type: String,
    choices: { builtin: "Built-in", toolbelt: "PF2e Toolbelt" },
    default: "builtin",
  });

  game.settings.register(MODULE_ID, SETTINGS.SHOW_ACTION_TRACKER, {
    name: `${localize(SETTINGS.SHOW_ACTION_TRACKER)}.Name`,
    hint: `${localize(SETTINGS.SHOW_ACTION_TRACKER)}.Hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });
}
