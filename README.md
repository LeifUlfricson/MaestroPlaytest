# Maestro (pf2e-maestro)

A homebrew Pathfinder 2e class for Foundry VTT: a tactician who commands a team of magical
puppets called pawns, each shaped by one of four Crafts (Flesh, Ethereal, Elemental,
Sympathetic).

- **Design spec:** [`docs/DESIGN.md`](docs/DESIGN.md)
- **Canonical rules text:** [`docs/maestro-rules-v2.1.md`](docs/maestro-rules-v2.1.md)
- **Implementer guide:** [`CLAUDE.md`](CLAUDE.md)
- **Manual QA script:** [`docs/QA.md`](docs/QA.md)
- **What's built and what isn't:** [`CHANGELOG.md`](CHANGELOG.md)

## What's here

The class item, all 23 class features, all 42 class feats, the four Craft chassis, the
Schematics system, pawn lifecycle (Controlled/Inactive/Broken/Destroyed), Take Control and the
formations built so far (Advance!, Coordinated Strike), 9 of the 11 command spells, and the
maestro-pawn link that projects a maestro's stats onto their pawns. See CHANGELOG.md for exactly
what each milestone added and, just as importantly, what it deliberately left out — a handful of
things need real UUIDs from the core PF2e compendium that couldn't be looked up while building
this (documented as DESIGN.md's Q11 in each case), and most of DESIGN.md's "Assist"-tier content
is a chat card and a dialog, not full automation, by design.

## Development

```bash
npm install
npm run build     # esbuild -> dist/module.js
npm test          # vitest
npm run lint
npm run pack      # packs/_source/* -> packs/* (LevelDB)
npm run unpack    # packs/* -> packs/_source/* (after editing in Foundry)
```

Symlink or copy this folder into your Foundry `Data/modules/pf2e-maestro` to load it in a world
running Foundry v14 (minimum 14.361) with the PF2e system (8.5.x).

## Before you trust it at the table

This module was built without a live Foundry/PF2e install to test against — every rule element,
hook name, and API call marked `(verify)` in the source and in DESIGN.md is a best-effort guess
against known PF2e conventions, not a confirmed fact. Run `docs/QA.md`'s script in a real world
before running a game with it, and expect to fix some field paths along the way.

## Release packaging

`module.json`'s `url`, `manifest`, and `download` fields are empty — they need to point at
wherever this repository ends up hosted (a GitHub release's manifest/zip URLs, most commonly)
before Foundry's "Install Module" flow can use them. Bump `version` in both `module.json` and
`package.json` together when cutting a release.
