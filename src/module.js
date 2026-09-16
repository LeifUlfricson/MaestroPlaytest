import { registerSettings } from "./settings.js";

Hooks.once("init", () => {
  registerSettings();
});
