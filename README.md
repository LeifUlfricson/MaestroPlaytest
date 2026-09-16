# Maestro (pf2e-maestro)

A homebrew Pathfinder 2e class for Foundry VTT: a tactician who commands a team of magical puppets called pawns.

- **Design spec:** [`docs/DESIGN.md`](docs/DESIGN.md)
- **Canonical rules text:** [`docs/maestro-rules-v2.1.md`](docs/maestro-rules-v2.1.md)
- **Implementer guide:** [`CLAUDE.md`](CLAUDE.md)

## Development

```bash
npm install
npm run build     # esbuild -> dist/module.js
npm test          # vitest
npm run lint
npm run pack      # packs/_source/* -> packs/* (LevelDB)
npm run unpack    # packs/* -> packs/_source/* (after editing in Foundry)
```

Symlink or copy this folder into your Foundry `Data/modules/pf2e-maestro` to load it in a world running Foundry v14 (minimum 14.361) with the PF2e system (8.5.x).
