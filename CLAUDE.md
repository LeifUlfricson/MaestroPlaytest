# CLAUDE.md — pf2e-maestro

This repository builds **Maestro**, a homebrew Pathfinder 2e class, as a Foundry VTT module. It targets Foundry **v14** (minimum 14.361) and the PF2e system **8.5.x**.

## Read first
- `docs/DESIGN.md`: architecture, data model, feature catalog, milestones, and open rules questions. It is the spec.
- `docs/maestro-rules-v2.1.md`: canonical rules text (Beta v2.1 / Playtest v1.0). Item descriptions are copied from this file word for word.

## Rules of the road
- **Don't change game rules.** If the rules are unclear, use the default in DESIGN.md §11 and leave a `// RULES-QUESTION(#n)` comment. If a question isn't listed there, stop and ask Erik.
- **Prefer PF2e rule elements over code.** Write code only for cross-actor state (maestro ⇄ pawns), token geometry, lifecycle, and dialogs.
- **Verify before relying.** Anything marked **(verify)** in DESIGN.md must be checked against the installed `systems/pf2e` source or the `foundryvtt/pf2e` `v14-dev` branch. When the spec is wrong, fix the code and update DESIGN.md in the same commit.
- **Keep rule math pure and tested.** All rule math lives in `src/rules/` as pure functions with Vitest tests, with no Foundry globals. Glue code imports those functions.
- **Keep IDs stable.** Every compendium document has a hard-coded 16-character `_id`. Never regenerate IDs, because `GrantItem` UUIDs depend on them.
- **One writer.** Only the active GM client performs cross-actor writes (fall back to the owner when no GM is connected).
- **Optional integrations are optional.** Sequencer, PF2e Toolbelt, and Portal must be feature-detected, and the module must work without them.
- **Work in milestone order** (DESIGN.md §9). Finish each milestone's "Done when" checks before starting the next.

## Commands
```bash
npm install
npm run build     # esbuild → dist/module.js
npm test          # vitest (src/rules, src/link/projection)
npm run lint
npm run pack      # fvtt-cli: packs/_source/* → packs/* (LevelDB)
npm run unpack    # packs/* → packs/_source/* (after editing in Foundry)
```

## Conventions
- **Code style:** ESM JavaScript with JSDoc. No default exports. `MODULE_ID = "pf2e-maestro"`.
- **Flags:**
  - `flags["pf2e-maestro"].maestro` on maestros.
  - `flags["pf2e-maestro"].pawn` on pawns.
  - `flags["pf2e-maestro"].pawnUuid` on Packed Pawn items.
- **Slugs:** kebab-case and identical to the PF2e-style slug of the item name (for example, `take-control`, `putrid-pins`, `blood-of-the-master`).
- **UI:** use ApplicationV2 for all dialogs. Use `renderChatMessageHTML` for chat-card buttons.
- **Localization:** every user-facing string goes in `lang/en.json` under `PF2E_MAESTRO.*`.
- **Commits:** one logical change each. Update CHANGELOG.md when a milestone completes.
