# Changelog

## 0.1.0

All eight planned milestones (DESIGN.md §9) are done. Nothing in this module has been run
against a live Foundry/PF2e client yet — see `docs/QA.md` for the checklist to run before
trusting it at a table, and README.md's "Before you trust it at the table" section.

**Update:** a first live session (Foundry v14 Build 367, PF2e 8.4.1) happened shortly after this
version was tagged. It found and fixed three real bugs — see "Fix bugs found by live testing in
Foundry v14 / PF2e 8.4.1" — and confirmed the core pawn-stats/projection pipeline (M2-M4) matches
DESIGN.md's worked examples exactly on a live character sheet. `docs/QA.md` has the details of
what's been checked so far and what's still outstanding.

**Update 2:** a second live session, testing command spell proficiency, reported "Maestro's
Mastery doesn't increase command spell DC to Master." That flagged a genuine miss in Q1's
original resolution: Maestro's Mastery was only bumping spellcasting to Expert (a no-op after
Maestro's Expertise), when the designer's intent was for it to reach Master. The rules text and
both compendium features (`maestros-mastery.json`'s spellcasting rank now upgrades to 3) have
been corrected — see the amended Q1 entry above. Chasing the original report also found two real
bugs along the way, both fixed:
- `focus-entry.js`'s "Command Spells" spellcasting entry creation had the same unlocked
  check-then-create race as the pawn Link effect duplicate (see M2/M3's fix above): answering the
  Craft ChoiceSet could fire `updateItem` twice in close succession, both seeing no entry yet and
  both creating one. Fixed with the same per-actor promise-chain lock, in `grant-spells.js` too
  (it had an identical race granting the same command spell twice).
- The focus pool never grew when a command spell was granted. The `grantSpell` in
  `grant-spells.js` used to set `system.resources.focus.max` directly via `maestro.update()`; the
  system recomputes that value from rule elements during data prep and stomped the manual write
  back to 0 every time. The fix embeds an `ActiveEffectLike add` of 1 on the *granting feat or
  feature* instead (`maestros-craft.json` for the four Craft-gated command spells, predicated on
  craft + level; each feat itself for the five feat-gated ones) — matching how real PF2e focus
  feats work. A rule on the *spell* item itself was tried first and silently discarded: PF2e
  8.4.1 does not process `system.rules` on `spell`-type items at all, confirmed by embedding a
  hand-built spell with a rule (no compendium involved) and seeing it come back empty.

**V2.2 balance pass:** the designer supplied a set of rules-text changes (Playtest V2.2, pending
approval) affecting seven items, applied to the canonical rules text (`docs/maestro-rules-v2.1.md`),
DESIGN.md, and their compendium sources:
- **Pyrrhic Defense** now grants resistance (2 + level) to the triggering Strike instead of fully
  redirecting the damage, and only triggers on Strikes (not any damage source). Still Manual tier —
  the resistance math and redirect are straightforward to state but the reaction still needs a GM
  to apply it against a live incoming Strike.
- **Tandem Maneuver** no longer upgrades to a critical success when both pawns succeed.
- **Sealed Fate** is now limited to once per round per maestro. `src/pawns/lifecycle.js`'s
  `checkSealedFate` gates on the same combat-id/round lock pattern as the formation lock
  (`src/actions/formation-lock.js`), ignored outside combat.
- **Fate's Embrace** dropped from four success tiers to three: Success (was Critical Success) is
  unaffected, Failure (was Success) gets the –2 status penalty, and Critical Failure (was Failure)
  lets the triggering effect through as Lay Bare would. The old Critical Failure tier (crit hit +
  auto-crit-fail the triggering save) is removed outright, not merged into anything.
- **Putrid Pins** reverted from scaling on every 20 HP the pawn spends back to every 10 HP —
  DESIGN.md's own reference table (§6.4) still described the 10-HP version, so this was a
  content/doc mismatch as much as a balance change.
- **Cornered** now explicitly scopes its –2 penalty to Perception checks and saves *against the
  maestro and their pawns* (including against effects the maestro or pawns create), rather than
  reading as a blanket penalty against anyone.
- **Flanking Strike** (resolving Q14) changes both pawns' movement from up to full Speed to up to
  half Speed.

None of these seven had existing code automation beyond Sealed Fate's hook, so this pass is
mostly compendium/doc text — Sealed Fate's once-per-round lock is the only new logic.

**Full check-up (third live session):** a broad pass across the module rather than one report.
Confirmed working, several for the first time: Elemental Craft's 11th/17th-level content
(Elemental Warding resistance, Elemental Avatar's d12 dice/persistent damage/critical-hit
immunity), Switch Form (smoke test 6 — Force Bolt/Force Bash correctly swap), Take Control and
Release Control including the simple-mode tether draw/removal, fresh pawn creation for Flesh and
Sympathetic Crafts, and all seven V2.2 balance-pass edits reading correctly from the live
compendium. Found one real bug: **Flesh Pawn** (`flesh-craft.json`) was granting immunity to
healing — exactly backwards from DESIGN.md §6.1, which calls out Flesh as the *one* Craft that
omits this immunity (Battle Medicine is supposed to be a Flesh Pawn's only way to heal). Fixed:
the erroneous `Immunity` rule is removed and the pawn's description now states the Battle
Medicine caveat directly, matching how similar GM-facing guidance is written elsewhere in this
module. Also reconfirmed, with tighter proof this time, the duplicate-spell/duplicate-entry
symptom from Update 2: instrumenting `Actor.prototype.createEmbeddedDocuments` directly shows
`grant-spells.js` and `focus-entry.js` each call it exactly once per grant, yet the actor's raw
source data sometimes ends up with two distinct item IDs anyway. Since the call site itself is
proven single, this is not a bug in the module's own locking — it's below that layer, most likely
a socket/document-persistence quirk specific to running Foundry under heavy scripted/automated
control. Still unresolved; needs testing on an ordinary human-operated client to know whether it
reproduces there at all.

**Testing the remaining Crafts (fourth live session):** exercised the Flesh, Sympathetic, and
Ethereal mechanics that had never been run before — Blood of the Master, Sealed Fate (including
the once-per-round limit), Fatebound, Fate's Embrace's grant, and Spatial Surge. Found and fixed
two real bugs:
- **Level-gated `GrantItem` rules on craft chassis items never fired for a normal fresh pawn.**
  A pawn is created at level 1 (the template default) with its craft chassis *already embedded*,
  and only afterward does `projectMaestro` update the pawn to the maestro's real level.
  `GrantItem`'s predicate is checked once, at the item's first evaluation, unless
  `reevaluateOnUpdate: true` is set — so a pawn's level-11 Putrid Pins, level-5 Warp
  Strike/Shield Barrier, and level-11 Resonant Form effect (all pawn-side) silently never
  granted, no matter how high the maestro's level was. The same gap existed on the maestro's own
  side for Fate's Embrace (`maestros-craft.json`, level 11 Sympathetic) for the realistic case of
  a character leveling up normally rather than being created pre-leveled. Fixed by adding
  `reevaluateOnUpdate: true` to all five affected `GrantItem` rules (three in
  `ethereal-craft.json`, one in `flesh-craft.json`, one in `maestros-craft.json`); confirmed live
  for all five.
- **Sealed Fate's own once-per-round lock (added in the V2.2 pass) had the same race it was
  built to prevent.** The check-then-set was a persisted-flag read followed by an async
  `setFlag` write; two `updateActor` calls for one HP change (the same duplicate-firing symptom
  documented in `grant-spells.js`/`focus-entry.js`) could both read "not used yet" before either
  wrote it, producing two Sealed Fate cards from a single hit — reproduced live. Fixed by
  claiming the round synchronously against an in-memory `Map` before the function's first
  `await`, the same fix shape as the pawn-lock/maestro-lock pattern used elsewhere; confirmed
  live across two rounds (exactly one card each round, second same-round hit correctly blocked).

**Fixing notification spam and removing the MAP HUD (fifth live session):** two UI annoyances
reported from actual play:
- **The `reevaluateOnUpdate: true` fix above had a side effect: PF2e's own "already has X, so it
  has not been added again" notification fired on every relevant actor update once a pawn's
  Putrid Pins/Warp Strike/Shield Barrier/Resonant Form (or the maestro's Fate's Embrace) had
  already been granted.** Root cause: none of the five `GrantItem` rules had an explicit `flag`,
  so PF2e auto-generates one from the granted item's slug — and without `reevaluateOnUpdate`
  pinning that flag at construction time (it reads `this.flag` before the auto-generation logic
  ever runs), each re-evaluation regenerated a *new*, incrementing flag key (`warpStrike`,
  `warpStrike2`, ...) instead of reusing the one that already recorded the grant. Foundry's own
  `preUpdateActor` short-circuit (skip silently if `itemGrants[this.flag]` already resolves to an
  owned item) never took effect, so it fell through to the creation path every time and re-hit
  the "already has it" notice. Fixed by giving all five rules an explicit `flag` matching the
  name PF2e's own auto-generation would have produced on a fresh grant (`putridPins`,
  `warpStrike`, `shieldBarrier`, `resonantForm`, `fatesEmbrace`) — confirmed silent on repeated
  no-op updates and on the maestro gaining/losing a feat. **Existing pawns/maestros that already
  had one of these five items granted keep the old, flag-less rule data frozen on their embedded
  item copy** (rule elements are re-instantiated from the item's own stored `system.rules`, not
  refreshed from the compendium), so the compendium fix alone doesn't reach them; those actors
  need a one-time repair that adds the matching `flag` to the affected item's rules and drops any
  stray incremented `itemGrants` keys pointing at the same granted item. Ran and confirmed on the
  affected live-session actors.
- **The "MAP step" HUD (`src/ui/action-tracker.js`, DESIGN.md §5.7's Decision D5) was more
  friction than aid in practice** — a floating window every client had to dismiss or reposition
  on load. Removed entirely: the source file, its `registerActionTracker()` call in `module.js`,
  the `showActionTracker` client setting (`config.js`/`settings.js`/`lang/en.json`), and the
  now-stale HUD description in DESIGN.md/QA.md. Shared MAP and the shared reaction remain a
  manual table aid per Decision D5, just without a dedicated widget.

**Pawn art on creation:** the "Create Pawn" dialog (`src/pawns/create-pawn.js`) now has an Art
field using Foundry's `<file-picker>` element, so a player can browse to or upload custom art for
a new pawn instead of getting the "Pawn" template's generic image. Picking a file sets both the
actor's portrait and its prototype token texture; leaving it blank keeps the template's own art,
unchanged from before. Confirmed live: the browse/upload dialog opens and the chosen path lands
on both `img` and `prototypeToken.texture.src` for the created actor.

**Fixing empty compendiums in the published GitHub release:** the first public release
(v0.1.0) installed fine but granted nothing — the Maestro class's features never
auto-populated. Every compiled compendium pack in that release was silently empty: the raw
`.ldb` table files on disk genuinely contained the compiled item data (confirmed by grepping
their bytes directly), but LevelDB's own `CURRENT`/`MANIFEST` bookkeeping didn't reference it,
so any reader (Foundry included) saw zero entries despite the data physically existing. This
didn't reproduce locally or in a fresh `git clone` + `npm ci` + `npm run pack` on this machine,
which points at a `compilePack`/`classic-level` write-manifest race that's more likely to show
up on a different platform (the release was built on `ubuntu-latest`) than at true root cause
inside our own code. Rather than chase the upstream timing bug, `tools/pack.mjs` now reopens
each pack right after compiling it and verifies it has a nonzero entry count, recompiling up to
twice more before failing the build loudly — turning a silent bad release into a build failure
instead. `classic-level` (already an indirect dependency of `@foundryvtt/foundryvtt-cli`) is now
also a direct `devDependency` since `pack.mjs` imports it for this check.

Also confirmed working as designed: Connective Tissue's HP scaling, Blood of the Master's spend/
heal/Broken-removal/Take-Control/damage-bonus math, Fatebound application, and Spatial Surge's
3-Controlled-pawn and 10-ft-proximity requirements with the correct DC/damage. Master of Souls
(*wails of the damned*/*seize soul*) remains the one confirmed gap at Sympathetic 17th — still
blocked on real core-compendium UUIDs this environment can't look up (Q11).

**Testing Formations and Schematics (fifth live session):** exercised both systems for the first
time; found no bugs. Confirmed live:
- **Advance!** posts the Stride card for the chosen Controlled pawns and sets the formation lock.
- **Coordinated Strike** correctly requires exactly 2 pawns (or 3 with Coordinated Assault, at a
  –4 penalty instead of –2, with the Checkmate reminder text when that feat is present too), and
  rejects other counts without posting a card or touching the lock.
- **The formation lock** is shared correctly across both actions: setting it via Advance! blocks
  a same-round Coordinated Strike, and it releases cleanly on the next round.
- **Schematics**, tested from a genuine non-GM player account (this world only had a GM user, so
  a temporary player was created for this) rather than the GM, since the module's own
  `preCreateItem` check intentionally lets every GM action through: the "Install Schematic"
  sheet button and dialog work, the 2-slot limit correctly blocks a 3rd installation, and Spring-
  Loaded Compartment correctly requires Extra Space to already be installed. One UX rough edge,
  not a functional bug: a blocked schematic's own creation-time `ChoiceSet` prompt (e.g. Adaptive
  Design's five-mode choice) still appears and must be answered before the rejection lands,
  since PF2e's own item-preparation flow runs ahead of the module's veto hook; the item is
  correctly absent afterward regardless of what's picked.

**Fixed the "Create Pawn" button not appearing on the maestro's sheet.** This was tracked as a
known gap since M2: `getActorSheetHeaderButtons` never fires on Foundry v14's ApplicationV2
character sheet, so the button never rendered and a player who took the Maestro class had no
in-sheet way to make a pawn (only the `api.createPawn` console workaround). Fixed in
`src/module.js` by switching to the same `renderActorSheet` + direct DOM insertion approach
`schematics.js`'s "Install Schematic" button already used successfully on pawn sheets. Confirmed
live: the button now appears on a maestro's sheet and opens the Create Pawn dialog correctly,
does *not* appear on non-maestro or pawn sheets, and coexists cleanly with "Install Schematic" on
a pawn's own sheet.

**Simplified Ethereal Craft (designer-directed):** attack/defense form is no longer a mechanical
gate. Force bolt and force bash are both always available on every Ethereal pawn, unconditionally
(the `ethereal-form:attack`/`ethereal-form:defense` roll-option predicate is removed from both
Strikes in `ethereal-craft.json`); Warp Strike and Shield Barrier were already granted
unconditionally at level 5 and are unchanged. Switch Form drops to Assist tier: `switch-form.js`
is deleted, along with its Execute-button entry and `api.actions.switchForm` — using the action
now just posts its own descriptive PF2e chat card, like any action item with no module handler
attached. Form is now tracked only as a fictional label for Resonant Form's adjacency count, via
two new effects (`maestro-effects`): **Attack Form** and **Defense Form**. They're applied to a
pawn by hand (drag from the compendium, a macro, however), and a new `createItem` hook in
`src/pawns/lifecycle.js` (`enforceExclusiveEtherealForm`) makes them mutually exclusive
regardless of how one gets applied, by deleting the other. The old flag-based plumbing this
replaces — `flags.pf2e-maestro.pawn.form`, its initial assignment in `create-pawn.js`, and
`buildCraftLinkRules`'s `form` parameter in `projection.js`/`link-service.js` — is removed
entirely, along with its unit test and the now-dead `PF2E_MAESTRO.UI.SwitchForm.*` lang strings.

**Cleaned player-facing text on the Maestro's class features and Crafts.** Audited every
`classfeature`-category item's description in `maestro-features` (all 23 were already clean) and
`maestro-pawn-features`'s four Craft chassis plus the `Pawn`/`Pawn Frame` stubs, and removed
implementation asides that had crept in over several live-testing sessions: roll-option names,
"Maestro Link effect" references, "(verify)"/"known gap (found by live testing)" notes,
"not automated" caveats, and file/section-number pointers like `src/...` and `DESIGN.md §...`.
Two spots got more than a trim: Flesh Pawn's Battle Medicine paragraph and Sympathetic Pawn's
Sealed Fate paragraph were paraphrases written during implementation; replaced both with the
actual canonical wording from `docs/maestro-rules-v2.1.md` ("Stitched Together" and "Sealed
Fate," including the 1d6-per-tier damage scaling the paraphrase had dropped). `Pawn` and `Pawn
Frame` had no canonical equivalent at all (they're Foundry-only ancestry/class stubs invented to
represent a pawn's sheet) — reworded both from raw dev notes ("ancestry stub... see DESIGN.md
§4.1") into short factual text pulled from the "Pawns" class feature's own prose (Immunities,
Size, Speed, proficiencies), so they read as normal PF2e ancestry/class blurbs instead of
implementation commentary. Deliberately did not touch the Schematic items in the same pack
(`schematic-*.json`) or anything in `maestro-feats` — those are feat-gated content, not class
features, and several of them (Air Superiority, Castle, Custom Armament, Extra Space, Injector
Spike) do carry similar dev asides ("Not yet automated...", "Simplified: DESIGN.md gates
this...") that are worth a separate pass if wanted.

- M0: repo scaffold (esbuild, Vitest, fvtt-cli pack/unpack, module.json, trait registration, settings, empty packs, CI).
- M1: Maestro class item and all 23 class features (§6.1). The 12 pure-stat features (Great Fortitude, Weapon/Armor Expertise/Mastery, Evasion, Prescient Evasion, Resolve, Maestro's Expertise/Mastery, Vigilant Senses, Three Moves Ahead) carry real rule elements. The 3 Craft-innovation features (Cunning/Brilliant/Legendary Innovation) and Tactical Opportunist and Instinctive Control are purely descriptive on the maestro's side, as written. Pawns, Formations, Maestro's Craft, Coordinated Strike, Group Tactics, and Coordinated Assault exist with correct name/level/description but no rule elements yet — their mechanics depend on the pawn link service (M2), lifecycle (M3), Crafts (M4), and formations (M5).
- M2: Pawn template (ancestry + Frame class, `maestro-pawns`/`maestro-pawn-features`), the link service (`src/link/`), and the downtime creation wizard (`src/pawns/create-pawn.js`). `src/rules/pawn-stats.js` implements every §2.2 formula as a pure function, verified against all seven §2.3 worked-example fixtures plus the Metal/Wood/Stone/Large-Con checks from §8.1. `src/link/projection.js` builds the pawn actor-update patch and the generated "Maestro Link" effect's rule elements (AC, ability-based Strike attack, resilient save, skill upgrades, weapon runes, size), covered by unit tests including idempotency. Craft chassis, Packed Pawn items, and the pawn cap/range math are still out of scope (M3/M4).
- M3: lifecycle, packing, Take Control/Release Control, the control cap, Range of Control, and simple tethers. `src/rules/progression.js` adds the pawn cap, control weight, Range of Control, and Bulk formulas (§8.1). `src/pawns/lifecycle.js` handles the HP-triggered Inactive/Broken/Destroyed transitions (including "broken twice within 10 minutes" and the Destroyed folder move) and the maestro-unconscious transition. `src/pawns/packing.js` and `src/pawns/range.js` cover pack/unpack and the Range of Control watcher. `src/actions/take-control.js` and `release-control.js` implement the two actions (cap enforcement with a release prompt, 10-ft reach for unpacked pawns), wired to their chat cards via an Execute button (`src/ui/execute-button.js`) and to the token HUD's Pack button (`src/ui/token-hud.js`), plus thin hotbar macros. The "Inactive (Pawn)" and "Broken (Pawn)" effects and the two action items are new compendium content; the Pawns class feature (M1 placeholder) now has its real Aura and GrantItem rule elements. Ethereal form selection, Instinctive Control's free-action swap, and Sequencer tethers are still out of scope (M4/M5/M8).
- M4: the four Crafts. The Maestro's Craft feature (an M1 placeholder) now has a real ChoiceSet (with a nested Religion-or-Occultism choice for Sympathetic) whose `maestro:craft:*` roll option gates the trained-skill upgrade, Ethereal's Switch Form grant, and Sympathetic's level-11 Fate's Embrace grant. `src/spells/focus-entry.js` creates the "Command Spells" focus spellcasting entry with the right tradition once a Craft is chosen (the spells themselves are M6). Each Craft's pawn-side chassis (`maestro-pawn-features`) carries its Strikes, the healing immunity (moved off the base Pawn ancestry, since only Flesh omits it), and its level-gated 5th/11th/17th innovations where those aren't pure spells: Connective Tissue, Elemental Warding, Elemental Avatar are real rule elements; Putrid Pins, Warp Strike, and Shield Barrier are granted pawn actions; Resonant Form exists as a manually-tracked effect (its automatic adjacency counting is an explicit M8 stretch goal per DESIGN.md). `src/link/projection.js`'s new `buildCraftLinkRules` generates the per-pawn dynamic bits a static chassis item can't express: the Ethereal `ethereal-form:*` roll option (flipped by the new Switch Form action, `src/actions/switch-form.js`), and Elemental's `physical-element:*`/`magical-element:*` roll options plus the remapped creature traits (cold → water, electricity → air) and Solid Body's Wood Speed/Stone resistance. `src/pawns/create-pawn.js` now embeds the right chassis on a new pawn and prompts for Elemental's physical/magical elements. `src/pawns/lifecycle.js` adds Sealed Fate (any HP loss on a Sympathetic pawn damages its fatebound target for `sealedFateDice(level)`d6 spirit, basic Will against the maestro's class DC) and `applyFatebound`/automatic Fatebound cleanup when the linking pawn goes Inactive. Deferred: every command-spell-only innovation (Blood of the Master, Surge Form, Elemental Font, Possession, Master of Souls — all M6), Group Tactics/formations (M5), and the Battle Medicine/Stitch Flesh grants from Stitched Together, which need real core-compendium UUIDs this environment can't look up (DESIGN.md's own Q11: stop and ask rather than invent an ID).
- M5: formations, the formation lock, Tactical Opportunist, Group Tactics, and a minimal action HUD. Formations and Coordinated Strike (M1 placeholders) now grant their action items (Advance! and Coordinated Strike, new in `maestro-actions`); both handlers (`src/actions/advance.js`, `coordinated-strike.js`) check and set the formation lock (`src/actions/formation-lock.js`, keyed on the combat ID and round, ignored outside combat), and Coordinated Strike's handler reads Coordinated Assault (3rd pawn, -4 instead of -2) and a not-yet-existing Checkmate feat's slug for its reminder. `src/link/feature-map.js` is the first real content in the "maestro feature slug -> pawn-side rule elements" file the M2 repo layout named but left empty: it gives pawn Strikes the backstabber trait when the maestro has Tactical Opportunist. Group Tactics (`src/pawns/group-tactics.js`) implements DESIGN.md's own preferred option (spike B): a token-movement watcher applies a "Group Tactics (Target)" marker effect to any enemy within melee reach of 2+ of the maestro's pawns/self. It does **not** yet grant off-guard against that maestro's attacks — the EphemeralEffect step needs the core PF2e off-guard condition's UUID, which isn't available in this environment, so (per DESIGN.md's own Q11 precedent) that's left for a human to fill in rather than guessed. `src/ui/action-tracker.js` is a minimal MAP-step counter HUD (no reaction marker yet), gated behind the existing `showActionTracker` setting.
- M6: the 9 non-core command spells (`maestro-spells`) — Rapid Assembly, Elemental Font, Puppet's Curse, Sacrifice Pawn, Project Senses, Hold Together, Blood of the Master, Spatial Surge, and Blitz — plus the code that grants and casts them (§7). `src/spells/grant-spells.js` replaces the "GrantItem doesn't choose a spellcasting entry" gap DESIGN.md itself calls out: it adds each spell to the Command Spells focus entry (and grows the focus pool by 1) once its condition is met. The four Craft-gated grants (Elemental Font @ Elemental 5, Puppet's Curse @ Sympathetic 5, Blood of the Master @ Flesh 17, Spatial Surge @ Ethereal 17) work now; the five feat-gated ones (Rapid Assembly, Sacrifice Pawn, Project Senses, Hold Together, Blitz) are wired to feats that don't exist until M7, so they're inert until then by construction, not by omission. Each spell has a cast handler (`src/spells/cast-*.js`), reachable the same way as an action (an Execute button on its cast card, or `api.actions.cast*`). Sacrifice Pawn, Project Senses, and Hold Together get real automation — Hold Together in particular required extending `lifecycle.js`'s `preUpdateActor` hook to redirect a fatal HP change to 1 *before* it's ever persisted, exactly as DESIGN.md's own ordering note asks for, so the normal HP-zero transition never sees the 0. Rapid Assembly is fully automated too: it reuses a newly-exported `buildPawnActorSource` (factored out of the creation wizard) to spin up a temporary pawn, and a `updateWorldTime` watcher expires it (crumbling it via the existing Destroyed-state machinery) 10 minutes later. Elemental Font, Puppet's Curse, Blood of the Master, Spatial Surge, and Blitz are Assist tier — dialogs and inline-roll chat cards, not fully simulated damage/template automation, consistent with how the design doc itself tiers most of this content. Left out entirely: the two core-spell copies (*telekinetic projectile*/*hand* for Wires on the Wind, and *wails of the damned*/*seize soul* for Master of Souls) — both need real UUIDs from the core pf2e compendium that this environment can't look up, the same Q11 situation as Stitched Together (M4) and Group Tactics' off-guard (M5).
- M7: all 42 class feats (`maestro-feats`) and the Schematics system. Every feat exists with correct name/level/traits/prerequisites/description, so all are importable and pickable at their class-feat level slot (`category: "class"`, trait `maestro` — no class-item wiring needed, unlike the mandatory class features from M1). Feats get real rule elements where the automation is cheap and confident: Manual Might's RollOption toggle, Extracurricular Crafting's Crafting-rank upgrades, Custom Armament's pawn-side Strike (melee/ranged + damage-type ChoiceSets), Adaptive Design's five-mode ChoiceSet, Air Superiority's fly Speed, Life Imitates Art's four craft-predicated maestro Strikes, and Art Eternal's immunity list. Five feats (Second String, Sacrifice Pawn, Project Senses, Master's Will, Dextrous Mind) need no extra code at all — M6's `grant-spells.js` conditions were already watching for exactly these slugs. Expanded Control and Superior Control are wired into `src/pawns/range.js` (a new exported `maestroRange` helper) and `src/actions/take-control.js`'s reach check; Bigger Figures and Supersized are wired into the creation wizard's new size picker. `src/pawns/schematics.js` implements the Schematics system: a `preCreateItem` hook enforcing the 2-slot limit (with Spring-Loaded Compartment requiring Extra Space and counting as its own slot), and an "Install Schematic" sheet-header button that lists whichever Schematics the pawn's maestro has unlocked. The remaining feats (about half) are correctly tiered as Manual/Assist per DESIGN.md's own table — full rules text, but the GM/player resolves them by hand, same as most of M3-M6's Assist-tier content. Two feats (Wires on the Wind, Reactive Strike) hit the now-familiar Q11 wall: both need real UUIDs from the core PF2e compendium that this environment can't look up, so their grants are left undone rather than guessed.
- **Q1 resolved** (designer ruling): command spell proficiency isn't Trained-only forever — it tracks class DC exactly. Maestro's Expertise (9) bumps spellcasting to Expert and Maestro's Mastery (17) bumps it again to Master, both if the maestro has command spells. Updated in three places to keep them in sync: the canonical rules text (`docs/maestro-rules-v2.1.md`), `docs/DESIGN.md` (§2.1's table and §11's Q1), and the two compendium feature items, which each gained an `ActiveEffectLike` upgrading `system.proficiencies.spellcasting.rank` (to 2 for Expertise, 3 for Mastery), predicated on having chosen a Craft (a proxy for "has command spells," since Craft is mandatory at 1st level and a genuine spell-count check isn't something a predicate can easily express).
- M8 (Polish): every generically-iconed compendium item (94 of them, plus the Pawn template's two embedded items) now has a thematic icon from Foundry's bundled `icons/svg/` set instead of `mystery-man.svg`. `src/integrations/tethers.js` implements DESIGN.md §5.11's "Sequencer mode" (a persistent named Sequencer effect between the two tokens), feature-detected and falling back to simple-line mode when the Sequencer module isn't active. A localization pass moved every dialog title/hint/button label and notification/warning message across the action, spell-cast, creation-wizard, packing, and schematics code into `lang/en.json` under new `PF2E_MAESTRO.UI.*` keys. `docs/QA.md` is the manual QA script from §8.3: one combat-worth of checks per Craft at 1st/11th/17th level, plus an explicit list of the deliberate gaps (the Q11 core-UUID omissions from M4/M5/M6/M7, Assist-tier content, Resonant Form's manual counting) so a real QA pass doesn't mistake "documented as not automated" for "broken." Resonant Form's automatic adjacency counting — DESIGN.md's own explicit M8 stretch goal — was left manual rather than attempted; the effort-to-value ratio was poor next to everything else in this milestone. Version bumped to 0.1.0 in `module.json` and `package.json`; `module.json`'s `url`/`manifest`/`download` stay empty until this repository has somewhere to be hosted from.
