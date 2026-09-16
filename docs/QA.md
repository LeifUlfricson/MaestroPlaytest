# Manual QA script

One full combat per Craft, at 1st, 11th, and 17th level, in a live Foundry v14 (14.361+) world
running PF2e 8.5.x. This is the "QA script complete for all four crafts" bar from DESIGN.md's
M8.

**Status:** a first real session happened against Foundry v14 Build 367 / PF2e 8.4.1 (see the
"Fix bugs found by live testing" commit). It covered module activation, applying the class item,
choosing a Craft (Elemental), and creating a metal/fire pawn — roughly the "Setup" section below
plus the Elemental row's 1st-level check. That session found and fixed three real bugs (a PF2e
version-compatibility mismatch, 16 broken icon paths, and two functional bugs in the Elemental
Strike rule elements and the link service's duplicate-effect race) — see the CHANGELOG for
details.

A second session tested command spell proficiency at 17th level (Maestro's Mastery) and found two
more real bugs, also fixed: the "Command Spells" spellcasting entry could be duplicated by the
same check-then-create race as the pawn Link effect, and the focus pool never grew when a command
spell was granted (its `ActiveEffectLike` had to move from the spell item, which PF2e 8.4.1
ignores rule elements on entirely, to the granting feat/feature). See the CHANGELOG's "Update 2"
for details, including confirmation that "Mastery doesn't push spell DC to Master" is correct
per-design (Q1's resolution caps command spell proficiency at Expert), not a bug.

Everything else in this file — 11th/17th level for every Craft besides the two checks above, and
Flesh/Ethereal/Sympathetic entirely — is still unverified. Expect more of the same as the rest of
this script gets run for the first time. One methodology note from the second session: a
character's already-embedded items (class features, feats, spells) are copies frozen at grant
time — updating a compendium source file does *not* retroactively update copies already on a
character. Testing a compendium change against an existing character requires either deleting and
re-granting the specific item, or testing on a fresh character instead.

Before starting, run the automated checks that don't need Foundry:

```bash
npm run lint
npm test
npm run build
npm run pack
```

All four should pass cleanly (53 unit tests as of M8). Then load the module in a world with the
PF2e system, and work through the smoke tests in DESIGN.md §8.2 once (they're craft-agnostic),
followed by the per-craft table below.

## Setup common to every run

1. Create a maestro character, apply the `pf2e-maestro` class item, and confirm the sheet shows
   the right HP/Perception/save/attack/defense/classDC numbers for the level under test
   (compare against DESIGN.md §2.1).
2. Take the Maestro's Craft ChoiceSet prompt and pick the craft under test. Confirm:
   - The trained skill lands (Medicine/Arcana/Nature/Religion-or-Occultism).
   - A "Command Spells" spellcasting entry appears with the right tradition (Occult/Arcane/
     Primal/Divine).
3. Use the "Create Pawn" sheet button (or `game.modules.get("pf2e-maestro").api.createPawn`)
   to make a pawn of that craft. For Elemental, confirm the physical/magical element prompt
   appears and both element traits land on the pawn (check the Maestro Link effect's rules).
4. Confirm the pawn's stats match `src/rules/pawn-stats.js`'s fixtures for the maestro's Int/Wis
   at this level (HP, AC, unarmed Strike, saves, Perception — DESIGN.md §2.3).
5. Take Control of the pawn (Execute button on the Pawns feature's chat card, or the hotbar
   macro), confirm the Inactive effect clears and a tether is drawn (try both `simple` and, if
   the Sequencer module is installed, `sequencer` tether settings).
6. Move the maestro's token more than 30 ft away and confirm the pawn goes Inactive
   automatically (Range of Control watcher).
7. Reduce the pawn to 0 HP and confirm it goes Inactive + Broken; do it again within 10 minutes
   of world time and confirm the second Broken destroys it (DESIGN.md §5.2).

## Flesh Craft

| Level | Check |
|---|---|
| 1 | Rancid bite Strike is available (1d8 poison, deadly d8, finesse, grapple, poison, unarmed) and deals 1d4 persistent poison per weapon die on a crit. |
| 11 | Connective Tissue's +3 HP/level is baked into the pawn's max HP. Take the Flesh Pawn craft's Putrid Pins pawn action (granted via GrantItem once the maestro is 11th level) and confirm it's on the pawn's sheet; casting/using it is Assist tier (no auto damage roll). |
| 17 | Cast Blood of the Master: spend HP, confirm the maestro loses it, the chosen Flesh pawns heal and lose Broken, Inactive recipients get Controlled, and a pawn healed 10+ gets the +4 damage effect. |

## Ethereal Craft

| Level | Check |
|---|---|
| 1 | Force bolt (attack form) and force bash (defense form) Strikes exist, gated by the `ethereal-form:*` roll option from the Maestro Link effect. Use Switch Form (Execute button on its chat card) and confirm the *other* Strike becomes available after the next projection cycle (this is smoke test 6). |
| 11 | Warp Strike and Shield Barrier pawn actions are present (granted at level 5, so already there by 11). Resonant Form's effect exists on the pawn but its damage/AC bonus is **manually tracked** — this was left as an explicit stretch goal (DESIGN.md's own M8 note), not automated. |
| 17 | Cast Spatial Surge with 3+ Controlled Ethereal pawns clustered together; confirm it warns/blocks if fewer than 2 others are within 10 ft of the chosen origin pawn, and posts the damage card otherwise. |

## Elemental Craft

| Level | Check |
|---|---|
| 1 | **Confirmed live:** create a metal/fire pawn — elemental blow and elemental shot both show up as real Strikes dealing `1d6 fire`, the pawn's creature traits include `metal` and `fire`, HP/AC/saves/Perception all match `pawn-stats.js`'s predictions exactly. **Known gap, also confirmed live:** elemental blow does *not* have the parry trait, and neither Strike carries the element trait itself (only the creature does) — DESIGN.md's assumed syntax for conditional Strike traits isn't valid PF2e (see the "Fix bugs found by live testing" commit), and a fix needs more investigation against the real AdjustStrike schema. Create a stone/cold pawn: it has `earth` and `water` creature traits and physical resistance `1 + floor(level/2)` (not yet re-confirmed live after the fix, but uses the same mechanism that did work for metal/fire). |
| 11 | Elemental Warding's resistance (equal to level, to the pawn's magical element) is present on the pawn's Maestro Link. |
| 17 | Elemental Avatar: elemental blow/shot deal d12s, add 1d6 persistent damage of the element on a hit, and the pawn is immune to critical hits. The retaliation (6d6 to anything that touches/hits the pawn in melee) is **not automated** — confirm the Note is present and apply it by hand. |

## Sympathetic Craft

| Level | Check |
|---|---|
| 1 | Steal essence Strike exists. Hit a creature with it, then call `api.applyFatebound(target, pawn)` (the Note on the Strike explains this — applying it isn't automatic yet) and confirm the Fatebound effect lands, removing any other Fatebound effect from the same maestro. |
| 11 | Damage the Sympathetic pawn (e.g. via a Strike against it) while a creature is Fatebound to it, and confirm a Sealed Fate chat card appears with the right dice count for the maestro's level (1d6 at 1st, 2d6 at 5th, up to 5d6 at 17th+) — this is smoke test 8. Fate's Embrace is granted on the maestro at this level; its degree-based outcomes are Assist tier (GM resolves by hand). |
| 17 | Master of Souls (*wails of the damned*/*seize soul*) is **not implemented** — those are copies of core PF2e spells, and this environment had no way to look up their real compendium UUIDs (DESIGN.md's Q11). Confirm this is the only gap at 17th for this craft. |

## Known gaps to expect, not bugs

These are documented, deliberate omissions (see CHANGELOG.md for the milestone that made each
call), not things QA should file as regressions:

- **Core-item references left undone** (DESIGN.md's Q11: "stop and ask, don't invent a UUID"):
  Stitched Together's Battle Medicine/Stitch Flesh grants, Group Tactics' off-guard
  EphemeralEffect, Wires on the Wind's telekinetic cantrips, Reactive Strike's core grant, and
  Master of Souls' two 9th-rank spells.
- **Formation/Assist-tier content**: most feats past the "Auto" tier in DESIGN.md's own §6.2
  table post a reminder card and stop there — the GM and players resolve the mechanic by hand,
  matching the design's own tiering, not a shortcut taken here.
- **Resonant Form's adjacency counting** is manual (an explicit M8 stretch goal in DESIGN.md).
- **The action/MAP HUD** (`src/ui/action-tracker.js`) is a minimal MAP-step counter with no
  reaction marker yet.
- **Elemental Strikes don't carry the element/parry trait themselves** (confirmed live; see the
  row above and the "Fix bugs found by live testing" commit). The creature-level traits and the
  damage type both work correctly.
- **The "Create Pawn" sheet header button doesn't appear** on a maestro's character sheet
  (confirmed live: v14's ApplicationV2 sheet doesn't fire the legacy `getActorSheetHeaderButtons`
  hook, exactly as flagged `(verify)` since M2). Use `game.modules.get("pf2e-maestro").api.
  createPawn(actor)` instead — the "Install Schematic" button on a *pawn's* sheet does work,
  since pawns still use `renderActorSheet`-compatible rendering.

## Reporting results

If something in the "should just work" sections above doesn't, that's worth a real bug report
against the RE/field path involved — most of this module's mechanics are marked `(verify)` in
DESIGN.md and CLAUDE.md precisely because they were written without a live PF2e install to test
against. Note the exact console error (if any), the RE `key`/`path` involved, and whether the
Foundry/PF2e versions match `module.json`'s `compatibility.verified`.
