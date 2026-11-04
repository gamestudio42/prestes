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
- The bootcamp is seven stations, each with ordered, mandatory objectives checked
  from simulation state (never from a button press alone): 1 formation (select,
  box-select, camera, wedge, prone/crouch/stand, reach the zone), 2 fire (attack,
  aggressive posture, suppress, hold fire, face), 3 maneuver (flank, bounding
  advance, withdraw, hold), 4 defense (defensive posture, defend in cover,
  ambush, hold under fire), 5 recon (recon report, pursue, disperse, reserve,
  advance, regroup), 6 wounded and officer (full rescue, protect the instructor,
  keep cohesion after the instructor falls), 7 final (suppress, take and hold the
  line). A content test fails if any order, stance, posture, rescue or the officer
  aura and loss is not required by an objective. The instructor is a
  non-controllable NPC who follows the section and speaks each order in a
  callout; ammunition refills at every station.
- Training enemies use non-lethal fire: they suppress, force cover and pressure
  morale, but cannot wound, incapacitate, rout or kill the player troop. Training
  suppression is scaled down so incoming drills do not pin the whole section before
  it can take the trench. The player can still kill the training enemy, and its
  larger training pool keeps it alive long enough to be suppressed and secured.
- The exercise panel shows the station, the ordered objectives with the active
  one highlighted, live progress, instructor text, failure, retry and debrief. The old 27-step checklist and ten-mission campaign
  content are removed from the player-facing path and from the build.
- Exercise progress persists in `prestes.bootcamp.stations.v2`; the start screen
  offers Continue (station N/7) and Restart. Three-phase progress migrates
  (assembly to 1, assault to 2, hold to 7); legacy 27-step progress starts at 1.
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

## Mechanics review (2026-11-03)

A headless audit of every order and a play-through of the stations found and fixed:
attack, suppress and ambush stalling behind sight-blocking cover; moves onto cover
doing nothing; officer loss without a morale and cohesion effect; alternating
movement turning defend and ambush into plain moves; withdraw doing nothing once
no enemy was left; Face snapping back to the old fire target; training enemies
being acquired automatically; clicks on a fallen enemy losing the order; attack
and suppress all aiming at the nearest member (fire now spreads over the troop);
four catalogue orders without a button. `packages/simulation/test/mechanics.test.ts`
keeps one scenario per mechanic.

Manual Chrome play-through (PT-BR, interface only): stations 1 to 3 completed,
about 2.5, 1.5 and 1.5 minutes at 2x. Station 4 by hand exposed three more
problems, fixed: defenders shot the training troop from any distance (the spec
says once it enters the defended area) and burned all 220 rounds; the troop
advanced before the ambush was set and was shot down by the defenders; and the
troop walked into the trench itself. Station 7 exposed a respawn of the training
troop on the line while the section was out of ammunition. Ammunition still runs
low in long stations (a balance item for the redesign). Stations 4 to 7 are covered end to end by
`tests/e2e/training-campaign.spec.ts` (each station, the full run with a reload
and Continue, and the cohesion failure with retry) but were not yet played by
hand, and the EN pass is still to do.

Future scope recorded from the review: in campaign and skirmish the player
commands a command troop (commander plus two); the bootcamp keeps the instructor
as an NPC.

## Redesign plan (agreed 2026-11-03)

Four phases, each its own OpenSpec change:

1. `add-cover-slots`: cover slots on every cover kind and buildings as cover, so
   soldiers can be placed in trenches, behind walls and at building corners.
   Implemented 2026-11-04: 11 soldiers ordered into the training trench take
   distinct slots, defenders hold the side away from the threat, the preview and
   hover markers show the slots an order takes. Tuning found by the bootcamp
   e2e: slots within 4 m unless the cover is clicked, never more than 2 m toward
   the threat, no slots for recon (it must see) or the scripted training troop
   (it must stop at its standoff), automatic cover within 8 m. The determinism
   golden moved from `758a402c` to `44beb560`.
   Manual Chrome run (2026-11-04, PT-BR): station 4 completed by hand; the
   Defend preview and hover chip showed 11/11 slots, all 11 soldiers ended in
   distinct trench slots and the ambush fired from them. The run found and fixed
   three issues: bounding replaced slot destinations (4/11 in slots), separation
   pushed a soldier off its slot and stalled the bounding team, and with an order
   armed a click on cover full of our own soldiers picked a soldier instead of
   the ground. Station 7 by hand: the Suppress order drains all 20 rounds of every
   soldier in about 20 s, leaving nothing to clear the line, so the station cannot
   be finished by hand yet (see the ammunition item below).
2. Training ground in Rio de Janeiro: a new bootcamp map at a fictional training
   field near Vila Militar / Deodoro (where Prestes served in the 1st Engineer
   Company in 1922; Macaulay ch. II, pp. 37-38), with the stations laid out in
   sequence and the commander giving each order in a text callout and the panel.
   Includes the manual play of stations 5 to 7 and the EN pass carried over from
   `complete-bootcamp-tutorial`.
   Implemented as `redesign-training-ground`, archived 2026-11-04, which also covers the
   user's play-through notes (disorganized movement, slow default speed):
   - Default speed is now the one labelled 1x (two ticks per 100 ms); 0.5x is
     the slow option; start, retry and Continue reset to 1x; unpausing resumes
     the last speed. Three and React moved to their own chunks (game code
     247 kB of a 400 kB budget).
   - Movement: destinations (formation, line and cover slots) are matched to
     soldiers by minimum total distance in the simulation and the preview, so
     routes no longer cross; a gathered section follows one route in a compact
     body (5 m) and spreads to its slots near the end.
   - Map: `packages/shared/src/training-ground.ts` holds the course (stations,
     covers, buildings, trees, roads, fence, props) for the simulation and the
     view. Three rows on a winding road inside the 200 m path grid: parade
     ground, firing range, maneuver field (north); trench line, hamlet
     (middle); aid post, assault line (south). Each station keeps the tuned
     local layout (line 24 m east and 22 m north of the entry, and so on). The
     camera centres on each station; the panel names the place. The engine
     option `map` keeps the earlier training kit for the battle lab and the
     mechanics tests; the bootcamp and its sandbox tools use the training
     ground.
   - Commander balloon over the instructor with the current order, persistent
     while it is current, hidden off screen, following a language switch.
   - Flanking goes around the target's troop (its squad within 15 m), not the
     clicked soldier: flanking the end soldier of a line put the flankers in
     front of the rest of it (found by the full e2e run on the new map).
   - Hand play in Chrome (PT-BR, 1x, 2026-11-04), all seven stations through
     the HUD on the new map: formation about 1,360 ticks, fire about 1,400,
     maneuver about 1,780 (flank 2/2 on the first try), defense about 1,800,
     recon about 1,600 on its replay, wounded about 1,000, final completed with
     91 rounds left and 11/11 soldiers. Fixed during the play:
     - Regroup used the section's formation (a 28 m line) around the
       instructor, which split the section across the hamlet's trench and
       wall (4/9 regrouped): it now closes into a compact block (four files,
       2 m apart) on the instructor.
     - Fatigue rose 0.8 a tick while walking and recovered 0.03, so a 25 m
       walk took soldiers to 85 and Pursue stopped at 90 straight away: now
       marching nets 0.15 a tick (about a minute, 120 m, to 90) and rest
       recovers 0.1 (about 1.5 minutes).
     - With an order armed, a click picked the nearest soldier and dropped
       it if it was an able friendly, so Rescue on a casualty lying among his
       comrades went nowhere: able friendlies are now skipped by the pick
       itself.
     - The Face instruction said "the north marker"; the marker is behind the
       section. The balloon now clears when the exercise ends.
     Seen but not changed: one Reserve click did not register and worked on
     the second try (not reproduced); a Pursue aimed at the nearest troop
     member ends when that soldier falls.
   - EN pass in Chrome (2026-11-04): stations 1 and 7 played in English through
     the HUD and completed; the station 2 to 6 instructor texts and the
     debrief checked in the catalog and on screen. No untranslated player text;
     long instructor lines wrap in the balloon. Fixed: at a 929 px window the
     start card shrank to about 210 px and split the title ("Pres / tes"); the
     card's column now keeps 400 to 560 px. Left as is: `training.subtitle`
     ("Campo de Instrução — 1920") and the old `training.mission.*` texts are
     unused keys.
   - Not done yet: the art of the new map is plain (phase 4), and the section
     is placed at each station's entry rather than marching the road between
     stations.
3. Pixel-art HUD, menus and the Coluna Prestes compendium (in-game stays low-poly).
   Implemented as `pixel-art-interface`, archived 2026-11-04:
   - Pixel kit: Pixelify Sans (OFL) at 10 to 32 px, sepia tokens in
     `styles/pixel.css`, 2 px borders, stepped corners, hard shadows. Barlow,
     Cinzel and Lucide removed.
   - 61 original 16 x 16 icons in `assets/icons/prestes-icons.aseprite` (one
     slice each, first drawn from `icons.txt` by `tools/icons`); `pnpm icons`
     exports the sheet the game uses as alpha masks in the text colour.
   - Floating HUD windows (asked by the user): Orders, Troops and Troop
     summary, dragged by the title bar, minimized, kept in localStorage; the
     summary shows a helmet per soldier with health, morale and ammunition bars.
   - Main menu (asked by the user): an animated pixel scene of the column
     marching at dusk behind a vertical keyboard menu; still for reduced motion.
   - Compendium: a pixel book with figures, events, places, weapons and
     corrections from `docs/history`, each with its source and confidence,
     PT-BR and EN; the public-domain photograph is its pixelated cover.
   - Hand check in Chrome (929 px window, PT-BR): menu animates and the arrow
     keys move the cursor; windows drag, minimize and restore; the compendium
     reads in both languages. Found and fixed on the way: the stepped-corner
     clip cut off menus and banners that open from inside a window (the frame
     is now a clipped layer behind the content).
   - Verify: 298 unit tests and 39 e2e pass. On a loaded machine the suite took
     38 minutes and two long campaign tests timed out; both passed alone in
     1.5 minutes, and a step measured about 100 ms, so the interface did not
     slow the game.
4. Low-poly art pass: objects, movement and firing feedback.
   In progress as `low-poly-art-pass`: the Blender soldier (16 clips, with the
   low crawl and the rifle at the ready on contact orders) and the training
   ground models load in game; effects and the close (sections 4 and 5) remain.
   The glTF loaders are a separate chunk fetched on demand; the animation
   system raised the three chunk to 591 KB, so its budget went from 560 to
   610 KB (2026-11-04).

## Facing drag (`move-facing-drag`, 2026-11-04)

Asked by the user after playing: with a ground order armed (Move, Advance,
Recon, Defend, Ambush, Reserve, Disperse), pressing on the destination and
dragging turns the section to face that way; the formation is kept and laid
out rotated, and the soldiers keep the facing (as their aim) after arriving.
The right-button quick move does the same. The old drag that spreads the
soldiers on a line is now Shift + drag. Bounding re-laid the formation with
the soldiers' heading and reversed the wedge; it now prefers their aim, like
the move handler. Commands without facing are unchanged (golden kept).
`pnpm verify` passed: 308 unit tests, bundle budget, determinism, OpenSpec and
e2e 40/40 in 4.5 min (41/41 and 313 unit tests with the spacing). Checked in game through Playwright captures and the
arrival positions; a hand check in Chrome is still to do.

After the user's first hand check (they liked the movement) the drag length
also sets the spacing. After the second hand check (it only opened, never
closed) the drag starts in close order, 1.5 m between soldiers, and opens
linearly to 6 m at 20 m of drag; a plain click keeps 2.8 m. A label beside the
cursor shows the spacing (decimal comma in pt-BR) and the preview lays the
slots at it. The section keeps the spacing for formation changes and bounding
until an order without spacing; a formation change also keeps the ordered
facing now.

## Deferred

- Mission content, campaign progression and save/load.
- Selectable formations, destructible cover, cavalry, artillery and aircraft.
- Full character roster and final Blender meshes.
- Full audio production (music, voices, other effects) and final prop library.
- Direct control, Electron, multiplayer, voice and additional languages.
- Final low-poly art, audio and maps.

## Structure

The `refactor-structural-modules` change split the four largest files without
changing behavior (both determinism hashes and all tests unchanged):

| File | Before | After |
| --- | ---: | ---: |
| `packages/simulation/src/engine.ts` | 4,627 | 324 (+ 13 modules in `systems/`, largest 661) |
| `apps/game/src/App.tsx` | 1,646 | 569 (+ 6 hooks, largest `useOrders` 733) |
| `apps/game/src/ui/Hud.tsx` | 999 | 209 (+ 7 files in `ui/hud/`) |
| `apps/game/src/styles.css` | 5,006 | removed: 2,143 dead lines, rest in 4 files under `styles/` (largest 861) |

Known follow-ups found during the refactor. The placement-status and sandbox-inspector
mojibake and the PT-BR assembly count (six instead of five) are fixed; a source
encoding test now guards against mojibake. Still open:

- `tactical.spec.ts` "issues an area order" still waits on real-time ticks with
  a 5 s timeout and failed once under heavy load; it should step the simulation
  like the other specs.
- `useOrders` is 733 lines; the target-order and ground-order handlers can be
  split further once the campaign adds new order types.
- In a headless training engine, a soldier walking about 47 m on a defend order
  lost the order (and its slot) around tick 300 before arriving. Seen while
  testing cover slots; the cause is not yet investigated.
- Station 7 by hand (2026-11-04): Suppress emptied every magazine (20 rounds)
  in about 20 s at 2x, so the line could not be cleared afterwards. Fixed by
  `tune-training-ammunition`: the training troop and the instructor carry 5 + 45
  rounds (depot issue at Vila Militar, a game abstraction), and suppress fire
  eases to the rifle's normal rate once the target is pinned. The Coluna's
  sandbox, the battle lab and the training enemy keep 5 + 15 (Macaulay, p. 113);
  campaign ammunition is to be decided later. A mechanics test suppresses for
  40 s and checks every soldier keeps at least 10 rounds (it fails on the old
  values). Station 7 replayed by hand in Chrome (PT-BR, 2x, 2026-11-04):
  Suppress through the HUD finished the suppress objective at once; the section
  kept suppressing until all six training soldiers fell (about 80 s of game
  time) and still had about 20 rounds each; Move onto the trench took the line
  (10 soldiers in distinct slots) and the station completed in 6:55 with 201
  rounds left and 11/11 soldiers. Two observations, not changed: suppress fire
  alone killed the whole training troop, so it may be too lethal; and the
  section looked disorganized on the move (crossing paths, clustering), which
  `redesign-training-ground` addresses. The camera switch seen in this run was
  the user moving the camera during the test, not a bug.

## Verification

Run `pnpm verify` (or `pnpm verify:quick` without Playwright). It runs check,
build, the bundle budget (`tools/bundle-budget.json`), the determinism golden
(`tools/determinism-golden.json`), `openspec validate --specs` and e2e, stops at
the first failure and prints a per-step summary. `pnpm coverage` reports unit-test
coverage with a 90% line threshold (baseline 90.28%).

The repository is local-only: a local git repository with no remote. The GitHub
Actions workflow in `.github/workflows/` is kept but dormant, so `pnpm verify` is
the gate.

After `refactor-structural-modules` (2026-11-03): check, build, bundle budget
(index JS 957,768 B; worker 71,060 B; CSS 45,578 B), determinism (`eee8ea8f`),
`pnpm sim` (`206ab124`) and OpenSpec passed. The e2e step timed out once on the
hold-failure spec while the machine was under heavy load (suite 8.1 min instead
of about 3); the rerun passed 23/23 in 3.1 min, including the 5 visual specs.

Last `pnpm verify` run (2026-11-04, `redesign-training-ground` in progress):
every step passed in 4.9 min. check 289 unit tests, build, bundle budget (index
JS 254,907 / 400,000 B; three 526,340 / 560,000 B; react 221,715 / 240,000 B;
worker 85,610 / 90,000 B; CSS 47,059 / 85,000 B), determinism, OpenSpec and e2e
35/35 in 4.5 min. E2E videos are kept only for failing tests (test-results was
4.8 MB, about 160 MB before). One worker: two were tried and made timing
sensitive tests fail on software rendering for about 20% less time. A loaded
machine stretched the suite to 40 min and timed out station tests; the same
code ran in 4.5 min after a restart.

Previous `pnpm verify` run (2026-11-03): every step passed. check 184 unit tests,
build, bundle budget (index JS 953,147 / 1,000,000 B; worker 73,869 / 90,000 B;
CSS 70,670 / 85,000 B), determinism (golden `eee8ea8f`, seed 1922, 600 ticks),
OpenSpec 15 specs and e2e 18/18 in 2.6 min.

The first verify runs exposed flaky e2e specs that waited on wall-clock time.
They now step the paused simulation until each condition holds, with a tick
budget. The hold-failure spec also exposed a simulation bug: a bounding formation
slot inside a cover's clearance left the soldier with no path, waiting forever,
and A* could not reach an open target whose grid cell lay in that clearance.
Both are fixed (`assignBoundingDirect` uses `nearestOpenPoint`; `findPath` aims at
the nearest open cell), which changed the determinism golden from `75d9a841`.

Last recorded manual run:

- `pnpm check`: 184 tests in 24 files, 562 locale keys, content check passed.
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
- OpenSpec change `refactor-structural-modules`: archived as
  `2026-11-03-refactor-structural-modules` (no spec deltas); manual Chrome check of the
  start screen, codex, bootcamp phases 1-2, orders, sandbox placement and HUD hide/show passed.
- OpenSpec change `add-local-quality-gates`: archived as
  `2026-11-03-add-local-quality-gates`; 4 delivery requirements added; durable specs: 15 passed.
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































































