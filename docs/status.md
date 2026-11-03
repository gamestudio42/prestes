# Status

## Implemented

- pnpm workspace with `apps/game` and five packages.
- Deterministic kernel: xoshiro128**, FNV-1a hash, fixed 100 ms tick.
- Deterministic simulation engine with commands, events, frames, factions and
  active order paths.
- One player troop of 11 riflemen, a non-controllable officer instructor and training enemies with rifle combat, line of sight,
  cover, ammunition, reload, morale, suppression and victory/defeat.
- Squad selection by HUD and click; orders from the bottom panel or right-click;
  pause and 1x/2x/4x speed.
- Shot tracers, layered sandbag/stone/barrel/low-wall/trench cover visuals and
  separate fallen corpses. The cover layer is mounted in the scene, so the phase-2
  training trench is visible with its dark floor and sandbag parapet. A dead
  soldier uses a corpse mesh, muted uniform and blood pool with no
  selection ring; a living prone soldier keeps the normal rig and yellow order ring,
  and the strategic LOD uses a distinct flat corpse instance.
- Units face their target, path around blocking cover with A*, seek directional
  cover, score targets, flank covered enemies and react to suppression. Vision is
  a real 65-degree forward cone: sight-blocking cover interrupts it, an idle unit
  keeps its last facing, and only a current target or an explicit attack order turns
  the soldier. Training dummies are never auto-acquired; they only take fire after an
  explicit attack, suppress or flank order. Vision stays mechanical: live cones and
  sight lines are not drawn over the field; only the opt-in command preview shows
  planned facing.
- Cover only protects from the side it faces; low cover needs crouch/prone.
- Deterministic sandbox heightfield with a ridge, trench, crater and road. Slope
  and surface change movement speed; ridge/trench/crater add terrain cover.
- A procedural environment kit dresses the field: adobe farmhouse, barn with cupola,
  chapel, ruined cottage, windmill, camps, crop rows, rail fences, telegraph poles
  with sagging wires, layered trees, rocks, grass tufts and a parked cart. Cover and
  vegetation details are instanced; the visual props stay outside the simulation.
- Characters, paths, markers and tracers follow terrain height; ground picking
  raycasts the heightfield.
- Morale and suppression are separate. Units can be steady, suppressed, pinned,
  panicked or routed; panicked units drop, flee and leave the map.
- The reference command HUD uses a segmented top rail, a squad card with preview
  and select-all actions, seven primary order slots, a weapon/status card, and a
  command row with Position, Maneuver, Support, Formation, stance and objective
  controls. It shows effective cover, suppression, morale state, cohesion, fatigue
  and active rescue progress.
- Icon controls open localized hover/focus infoboxes; the tactical categories use
  accessible listboxes while preserving every `tactical-*` command.
- Cinzel is self-hosted for the brand, with Barlow/Barlow Condensed for data. Panels
  use translucent sepia fills, rounded corners, bronze hairlines and a low-poly
  clipped silhouette.
- The only added sound is an original procedural distant gunshot, driven by
  `shot` events with bounded concurrency and a persisted mute/volume control. No
  third-party sample is redistributed.
- The opening deployment starts outside rifle range; units do not auto-advance
  toward the enemy, so contact begins only when the player moves or an enemy
  enters range.
- A basic Men of War-inspired bottom orders panel shows the troop card, health,
  ammunition, morale, current order, order modes and stance.
- Player orders include move, attack, suppress, flank, withdraw and hold position,
  plus area orders for defend, ambush, disperse, recon and reserve, and support
  orders for regroup, protect-officer, pursue and rescue.
- The tactical order row keeps Position, Maneuver and Support orders in that
  sequence without permanent group headings. Area orders use a ground click;
  support orders use a unit target. Orders show in the HUD and are covered by
  the tactical E2E test.
- Prone soldiers use the yellow order ring, not the casualty red ring.
- Opt-in hover preview draws planned paths and destination markers without facing
  cones, keeping the field readable; movement previews use straight fast guides so
  dragging does not run cover routing or LOS checks per soldier. It starts off and
  is enabled by the Preview control. Preview and simulation share the same 8 m
  defend-region clamp.
- The HUD can be hidden with the Hide HUD button or H; a Show HUD control remains.
- The Tactical camera control now zooms to the 80 m tactical band instead of the
  strategic band, so the gabled roofs and ground props are read at a playable tilt.
- Movement destinations are cover-first when a reachable cover position exists.
- Units under a movement or tactical order seek reachable physical cover after arrival;
  the cover search no longer requires line of sight through the cover.
- The bottom orders panel collapses to a 34 px bar; the boot camp starts
  collapsed and exposes a Show orders control so the map remains visible.
- Fatigue rises during sprinting and movement and falls while holding; the HUD and
  sandbox inspector show it alongside soldier state.
- Formations are selectable in the HUD: line, column, wedge and free. Group moves,
  area orders and regroup use the selected formation; changing it redistributes
  slots and keeps the primary order.
- The sandbox can incapacitate the selected soldier and launch a rescue drill,
  so casualty and rescue-feedback flows are testable without combat randomness.
- Group movement slows a unit that is ahead of its peers, keeping the section
  inside a cohesion band instead of letting the officer outrun the riflemen.
- Defend clamps each slot to an 8 m region around the picked point, snaps slots
  to nearby cover, and holds without uncontrolled pursuit.
- Pursuit tracks the target, closes while out of range, and stops with an
  `order_interrupted` event on target loss, pinning or critical fatigue.
- An ambush fires once and then converts to a defend order; it does not re-trigger
  for the same event.
- New orders release a carried casualty safely; an incapacitated rescuer releases
  the casualty for reassignment by another soldier.
- Incapacitated soldiers can be rescued: a rescuer approaches, carries the
  casualty to nearby cover, treats, evacuates, recovers after 30 s and returns
  with the same id. A dying casualty aborts the rescue, and defend or flank can
  continue while the rescue team detaches. A second casualty can queue behind
  the active rescue for the same rescuer.
- Wounds are classified as none, light, moderate, severe or fatal. Light and
  moderate wounds reduce movement and accuracy; severe means incapacitated and
  fatal means dead. A previously wounded soldier who takes a lethal hit dies
  instead of becoming incapacitated. The HUD and sandbox inspector show the
  category.
- Recon stops at its objective, emits a contact report with enemy ids and
  avoids opening fire.
- Blocked movement recalculates an A* detour instead of freezing in place. Soldiers
  already inside a cover clearance margin can walk out of it, so a path that grazes
  a sandbag no longer stalls the whole formation.
- Recovery state can be carried into the next battle through the roster record,
  preserving the soldier id and remaining recovery time.
- F1 opens a sandbox lab with a unit inspector, one-tick/60-tick step, reset,
  dynamic sandbag/stone/trench cover, target dummies, both-sides control,
  per-side reinforcements and casualty drills.
- The bootcamp is now one playable three-phase exercise. Phase 1 forms the
  section at the assembly zone, phase 2 suppresses and takes the training
  trench, and phase 3 holds it for 60 seconds while protecting the instructor.
- Training enemies use non-lethal fire: they suppress, force cover and pressure
  morale, but cannot wound, incapacitate, rout or kill the player troop. Training
  suppression is scaled down so incoming drills do not pin the whole section before
  it can take the trench. The player can still kill the training enemy, and its
  larger training pool keeps it alive long enough to be suppressed and secured.
- The exercise panel shows phase, objectives, live progress, instructor text,
  failure, retry and debrief. The old 27-step checklist and ten-mission campaign
  content are removed from the player-facing path and from the build.
- Exercise progress persists in `prestes.bootcamp.exercise.v1`; resume restarts
  the saved phase, and legacy 27-step progress starts the new exercise at phase 1.
- Move and every ground order preview cover destinations even without a visible
  threat; cover points are reserved per soldier and the simulation separates
  living soldiers by at least 1.2 m, so previews and committed positions do not
  stack.
- The player troop is 11 soldiers; the officer instructor is a non-controllable NPC who regenerates nearby
  morale and always seeks cover.
- Clicking a friendly unit selects the whole troop. Leftward drag is a blue
  all-troop box; rightward drag is a green soldiers-only box.
- Hovering a target shows a target cursor; hovering a defensible point shows a
  shield cursor. Flank splits the troop into suppressing and flanking halves
  and commits every flanker to one side.
- Troop cohesion tracks spacing and officer proximity; low cohesion slows movement
  and constrains auto-cover. The HUD has no Select All button; Ctrl/Cmd+A remains.
- All soldiers start with the data-driven Mauser 7 mm profile: 5-round magazine,
  15-round reserve, weapon-driven range, cadence, damage and suppression.
- `docs/history/WEAPONS.md` records the period weapons, sources and which game
  values are abstractions.
- Section portrait cards are named CSS/Lucide placeholders, not final art.
- Worker-hosted simulation and a read-only `ClientMirror` on the main thread.
- Orthographic camera rig with tactical/transition/strategic bands, texel
  snapping and continuous pan/rotate/zoom.
- Strong pixel post (outline, bloom, soft shoulder, grade, posterized dither,
  vignette) with a clean toggle.
- Prestes palette and three-band toon materials.
- Original 1.75 m low-poly character proxies for a column soldier and officer,
  scalable for strategic zoom.
- Part-rig procedural walk cycle and standing/crouched/prone stances, with
  stance-aware selection rings. Every stance aims the rifle forward; prone lies
  face-down with the weapon still on target.
- Dashed movement paths, waypoint crosses and order rings for active move orders.
- React start screen, section cards, status/objective/outcome HUD, debug log,
  codex panel, language switch, pause/speed and post toggle.
- PT-BR/EN locale catalogs with key-set validation and hardcoded-text lint.
- Original-model export pipeline (`pnpm models`) and asset register.
- Historical figure registry, source policy, source keys and content validation.
- GitHub Actions check/build/Pages workflow and Playwright smoke test.

## Placeholders

- Character meshes are procedural proxies; final original Blender meshes and
  animations are pending.
- Terrain, walls, barrels, low walls, trees, telegraph poles and sandbags are low-poly placeholders.
- Combat numbers are a first balance pass; campaigns and save/load are not
  implemented.
- A single procedural gunshot is in place; the rest of the sound mix and final props are deferred.

## Deferred

- Mission content, campaign progression and save/load.
- Selectable formations, destructible cover, cavalry, artillery and aircraft.
- Full character roster and final Blender meshes.
- Full audio production (music, voices, other effects) and final prop library.
- Direct control, Electron, multiplayer, voice and additional languages.
- Final low-poly art, audio and maps.

## Verification

Run `pnpm verify` (or `pnpm verify:quick` without Playwright). It runs check,
build, the bundle budget (`tools/bundle-budget.json`), the determinism golden
(`tools/determinism-golden.json`), `openspec validate --specs` and e2e, stops at
the first failure and prints a per-step summary. `pnpm coverage` reports unit-test
coverage with a 90% line threshold (baseline 90.28%).

The repository is local-only: a local git repository with no remote. The GitHub
Actions workflow in `.github/workflows/` is kept but dormant, so `pnpm verify` is
the gate.

First `pnpm verify` runs (2026-11-03): check, build, bundle budget (index JS
952,852 / 1,000,000 B), determinism (golden `75d9a841`, seed 1922, 600 ticks)
and OpenSpec passed both times. e2e failed both times on timing-dependent specs,
a different set each run: run 1 `sandbox.spec.ts:42` (17/18 passed), run 2
`both-sides.spec.ts:44` and `training-campaign.spec.ts:122` (16/18 passed). The
sandbox spec passes 3/3 on its own. No game code changed between these runs and
the earlier 18/18 run, so the e2e suite is flaky under load. Fix it before
treating `pnpm verify` as green.

Last recorded manual run:

- `pnpm check`: 182 tests in 24 files, 562 locale keys, content check passed.
- `pnpm build`: passed; 952.85 kB JS before gzip (chunk-size warning remains).
- `pnpm e2e`: 18 passed with one worker (bootcamp exercise, both-sides demo, preview/HUD,
  smoke, sandbox, rescue drill and recovery, selection, tactical orders, formation.
- Both-sides video: `test-results/both-sides.webm`, 1440x900, 8 column versus
  5 legalist soldiers, with reinforcements and all implemented order types.
- Training video and screenshots are in `test-results/`; the playable exercise flow is covered by Playwright.
- HUD screenshots: `test-results/preview-hud.png` (desktop), `test-results/hud-sectors.png` (all sectors), `test-results/start-menu-new.png` (start menu) and
  `test-results/hud-narrow.png` (narrow); tooltip, category menu and audio
  controls covered by Playwright.
- Audio unit tests cover shot deduplication, bounded voices, mute/lock and missing
  AudioContext behavior.
- `pnpm sim`: hash `206ab124` on two consecutive runs.
- `openspec validate --specs`: 15 durable specs passed.
- OpenSpec change `add-playable-bootcamp-exercise`: archived as
  `2026-11-03-add-playable-bootcamp-exercise`; 10 requirements added, 4 modified
  and 2 removed.
- OpenSpec change `add-training-campaign`: archived as
  `2026-11-01-add-training-campaign`; durable specs: 14 passed.
- OpenSpec change `refine-command-hud-visual-audio`: archived as
  `2026-11-01-refine-command-hud-visual-audio`; durable specs: 14 passed.
- OpenSpec change `pause-contact-fix-defend-facing`: archived as
  `2026-11-01-pause-contact-fix-defend-facing`; durable specs: 13 passed.
- OpenSpec change `add-vision-cone-hud-redesign`: archived as
  `2026-11-01-add-vision-cone-hud-redesign`; durable specs: 13 passed.
- OpenSpec change `add-command-preview-cover-hud`: archived as
  `2026-11-01-add-command-preview-cover-hud`; durable specs: 13 passed.
- OpenSpec change `add-boot-camp-tutorial`: archived as
  `2026-11-01-add-boot-camp-tutorial`; durable specs: 12 passed.
- OpenSpec change `add-infantry-command`: archived as
  `2026-11-01-add-infantry-command`; durable specs: 11 passed.
- `gs42-standards check` and `doctor`: pass with 1.2.0 in WSL.































































