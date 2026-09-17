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

A second session tested command spell proficiency at 17th level (Maestro's Mastery) and reported
it wasn't pushing command spell DC to Master. That was a real miss in Q1's original resolution
(now corrected: Mastery upgrades spellcasting to Master, not Expert — see the amended Q1 entry in
DESIGN.md and the CHANGELOG's "Update 2"), and chasing it also found two more real bugs, both
fixed: the "Command Spells" spellcasting entry could be duplicated by the same check-then-create
race as the pawn Link effect, and the focus pool never grew when a command spell was granted (its
`ActiveEffectLike` had to move from the spell item, which PF2e 8.4.1 ignores rule elements on
entirely, to the granting feat/feature).

A third session was a broad check-up rather than chasing one report. Newly confirmed live:
Elemental's 11th (Elemental Warding resistance) and 17th (Elemental Avatar's d12 dice, persistent
damage, critical-hit immunity) content; Switch Form (smoke test 6 — Force Bolt/Force Bash
correctly swap on a Controlled pawn); Take Control and Release Control, including the simple-mode
tether being drawn and removed; and fresh pawn creation for Flesh and Sympathetic (previously
untouched). It found one real bug — **Flesh Pawn was granting immunity to healing**, backwards
from DESIGN.md's explicit "Flesh omits it" — now fixed (see the CHANGELOG). It also reconfirmed,
with tighter proof, the duplicate-spell/entry symptom from the second session: instrumenting
`Actor.prototype.createEmbeddedDocuments` shows the module's own code calls it exactly once per
grant, so the occasional duplicate is happening below the module, most likely a socket/persistence
quirk of running Foundry under scripted/automated control rather than a bug in `grant-spells.js`
or `focus-entry.js`'s locking. Unresolved; worth a data point from an ordinary human-operated
client.

A fourth session exercised the mechanics that had never actually been run: Blood of the Master,
Sealed Fate (including its once-per-round limit), Fatebound, Fate's Embrace's grant, and Spatial
Surge — all now **confirmed live** (see the per-craft rows below). It found and fixed two real
bugs:
- **Level-gated `GrantItem` rules on craft chassis items never fired for a normal fresh pawn.** A
  pawn is created at level 1 with its chassis already embedded, and only afterward does
  `projectMaestro` raise it to the maestro's real level; `GrantItem` only re-checks its predicate
  on update if `reevaluateOnUpdate: true` is set. This silently broke Putrid Pins (Flesh 11),
  Warp Strike/Shield Barrier (Ethereal 5), Resonant Form's effect (Ethereal 11), and — on the
  maestro's own side, for a character leveling up normally instead of being created pre-leveled —
  Fate's Embrace (Sympathetic 11). Fixed on all five; confirmed live.
- **Sealed Fate's once-per-round lock had the exact race it was meant to prevent** — two
  concurrent calls could both read the "not used yet" flag before either wrote it, posting two
  cards from one hit. Fixed with an in-memory, synchronously-claimed lock instead of a persisted
  flag; confirmed live across two rounds.

A fifth session tested Formations and Schematics — both **confirmed live**, no bugs found (see
the sections below). Schematics needed a genuine non-GM player account to test meaningfully,
since the module's own enforcement hook intentionally lets every GM action through; this world
only had a GM user, so a temporary player account was created for the session and removed
afterward.

Everything else is still unverified: Tandem Maneuver and Flanking Strike specifically (Advance!
and Coordinated Strike are covered; the other two formation feats have no code path, so
"verifying" them just means confirming their text is usable in play) and most of the 42 feats'
in-game behavior generally. One methodology note, reconfirmed each session since the second: a
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
   the Sequencer module is installed, `sequencer` tether settings). **Confirmed live** for
   `simple` mode, both directions (tether appears on Take Control, disappears on Release
   Control) — `sequencer` mode still needs a world with that module installed.
6. Move the maestro's token more than 30 ft away and confirm the pawn goes Inactive
   automatically (Range of Control watcher).
7. Reduce the pawn to 0 HP and confirm it goes Inactive + Broken; do it again within 10 minutes
   of world time and confirm the second Broken destroys it (DESIGN.md §5.2).

## Flesh Craft

| Level | Check |
|---|---|
| 1 | **Confirmed live:** rancid bite Strike is available (1d8 poison, deadly d8, finesse, grapple, poison, unarmed) with the correct traits; a fresh Flesh pawn is *not* immune to healing (the opposite was a real bug, now fixed — see CHANGELOG). Persistent poison on a crit and Connective Tissue/Putrid Pins are present but not yet exercised in play. |
| 11 | **Confirmed live:** Connective Tissue's +3 HP/level is baked into the pawn's max HP. Putrid Pins is present on the pawn's sheet (its `GrantItem` needed a fix — see CHANGELOG — to fire on a normally-created pawn at all); casting/using it is Assist tier (no auto damage roll). |
| 17 | **Confirmed live:** cast Blood of the Master — the maestro loses the spent HP, the chosen Flesh pawn heals by its even share, Broken is removed, an Inactive recipient gets Controlled (including unpacking first), and a pawn healed 10+ gets the damage-bonus effect. |

## Ethereal Craft

| Level | Check |
|---|---|
| 1 | **Confirmed live:** force bolt (attack form) and force bash (defense form) Strikes exist, gated by the `ethereal-form:*` roll option from the Maestro Link effect. Switch Form correctly swaps a Controlled pawn between them (smoke test 6 passes) — `api.actions.switchForm(maestro)` opens a picker limited to that maestro's Controlled Ethereal pawns. |
| 11 | **Confirmed live:** Warp Strike, Shield Barrier, and the Resonant Form effect are all present on the pawn (their `GrantItem`s needed the same fix as Putrid Pins to fire at all — see CHANGELOG). Resonant Form's damage/AC bonus is still **manually tracked** — an explicit stretch goal (DESIGN.md's own M8 note), not automated. |
| 17 | **Confirmed live:** with 3+ Controlled Ethereal pawns clustered together, Spatial Surge posts the correct damage card (`@Check[reflex|dc:{classDC}|basic]` against `10d10 force`). Not yet exercised: the warning path when fewer than 2 others are within 10 ft of the chosen origin pawn. |

## Elemental Craft

| Level | Check |
|---|---|
| 1 | **Confirmed live:** create a metal/fire pawn — elemental blow and elemental shot both show up as real Strikes dealing `1d6 fire`, the pawn's creature traits include `metal` and `fire`, HP/AC/saves/Perception all match `pawn-stats.js`'s predictions exactly. **Known gap, also confirmed live:** elemental blow does *not* have the parry trait, and neither Strike carries the element trait itself (only the creature does) — DESIGN.md's assumed syntax for conditional Strike traits isn't valid PF2e (see the "Fix bugs found by live testing" commit), and a fix needs more investigation against the real AdjustStrike schema. Create a stone/cold pawn: it has `earth` and `water` creature traits and physical resistance `1 + floor(level/2)` (not yet re-confirmed live after the fix, but uses the same mechanism that did work for metal/fire). |
| 11 | **Confirmed live:** Elemental Warding's resistance (equal to level, to the pawn's magical element — 20 resistance to fire on a level-20 pawn) is present on the pawn's Maestro Link. |
| 17 | **Confirmed live:** Elemental Avatar's elemental blow/shot deal d12s (`(1d12 + 2) fire`), add 1d6 persistent damage of the element on a hit, and the pawn has the `critical-hits` immunity. The retaliation (6d6 to anything that touches/hits the pawn in melee) is **not automated** — confirm the Note is present and apply it by hand. |

## Sympathetic Craft

| Level | Check |
|---|---|
| 1 | **Confirmed live:** steal essence Strike exists with the correct traits/damage on a fresh Sympathetic pawn. `api.applyFatebound(target, pawn)` correctly applies Fatebound to the target (applying it on a hit isn't automatic yet — the Note on the Strike explains this). |
| 11 | **Confirmed live:** damaging a fatebound-linked Sympathetic pawn posts a Sealed Fate card with the right dice count and DC (5d6 at level 17, `1 + [L≥5] + [L≥9] + [L≥13] + [L≥17]`) — smoke test 8 passes. The once-per-round limit (V2.2) is also confirmed: a second HP loss on the same pawn in the same combat round does not post a second card, and the limit correctly resets the next round. Fate's Embrace is granted at this level (its `GrantItem` needed the same fix as Putrid Pins for a normally-leveled-up character — see CHANGELOG); its degree-based outcomes are Assist tier (GM resolves by hand). |
| 17 | Master of Souls (*wails of the damned*/*seize soul*) is **not implemented** — those are copies of core PF2e spells, and this environment had no way to look up their real compendium UUIDs (DESIGN.md's Q11). Confirm this is the only gap at 17th for this craft. |

## Formations and Schematics

| Check | Result |
|---|---|
| Advance! posts the Stride card for the chosen Controlled pawns and sets the formation lock | **Confirmed live** |
| Coordinated Strike requires exactly 2 pawns, or 3 with Coordinated Assault (at a –4 penalty instead of –2, with the Checkmate reminder when that feat is present) | **Confirmed live**; picking any other count posts no card and doesn't touch the lock |
| The formation lock is shared between Advance! and Coordinated Strike: setting it via one blocks the other in the same round, and it releases on the next round | **Confirmed live** |
| Schematics: the "Install Schematic" pawn-sheet button and dialog work | **Confirmed live** |
| Schematics: the 2-slot limit blocks a 3rd installation | **Confirmed live, tested as a non-GM player** (the module's `preCreateItem` check intentionally lets every GM action through, so this can't be exercised as GM) |
| Schematics: Spring-Loaded Compartment requires Extra Space already installed | **Confirmed live, tested as a non-GM player**, same caveat |

One UX rough edge in Schematics, not a functional bug: a schematic that gets rejected by the slot
limit can still show its own creation-time `ChoiceSet` prompt first (e.g. Adaptive Design's
five-mode choice) — PF2e's own item-preparation runs ahead of the module's veto hook. The item is
correctly absent afterward no matter what's picked, but a player sees the prompt before the
rejection lands.

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
- **Occasional duplicate documents from a single API call** (confirmed live, see the third and
  fourth sessions' CHANGELOG entries): `grant-spells.js` and `focus-entry.js` are proven, via
  direct instrumentation, to call `createEmbeddedDocuments` exactly once per grant, and the
  fourth session saw the same thing happen to a single `ChatMessage.create` call (Sealed Fate
  posted two identical cards from one hit, in a round where the module's own once-per-round lock
  was confirmed to have only tried once). Not reproducible as a module-code bug — if you see a
  duplicate spell, a second "Command Spells" entry, or a duplicate chat card, delete/ignore the
  extra by hand and note whether it happened on an ordinary client or one under scripted/remote
  control.

## Reporting results

If something in the "should just work" sections above doesn't, that's worth a real bug report
against the RE/field path involved — most of this module's mechanics are marked `(verify)` in
DESIGN.md and CLAUDE.md precisely because they were written without a live PF2e install to test
against. Note the exact console error (if any), the RE `key`/`path` involved, and whether the
Foundry/PF2e versions match `module.json`'s `compatibility.verified`.
