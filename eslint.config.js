export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        game: "readonly",
        Hooks: "readonly",
        foundry: "readonly",
        CONFIG: "readonly",
        canvas: "readonly",
        ui: "readonly",
        ChatMessage: "readonly",
        Actor: "readonly",
        Folder: "readonly",
        PIXI: "readonly",
        fromUuid: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        document: "readonly",
        HTMLElement: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["tools/**/*.js", "tools/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        URL: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
