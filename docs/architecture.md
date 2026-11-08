# Architecture

## Shape

```text
apps/game        Vite entry, React HUD, worker host, i18n, storage
packages/kernel  seeded RNG, FNV-1a hash, fixed-step helpers
packages/shared  protocol types, client mirror
packages/simulation  authoritative state, commands, events, frames
packages/view3d  orthographic camera, pixel post, characters, paths
packages/content figures, sources, locale catalogs, validation
tools            headless simulation, model export, locale/content checks
docs             architecture, history, assets, decisions
```

Dependency direction: `kernel -> shared -> simulation`; `shared -> view3d`;
`apps/game` composes everything. `packages/simulation` must never import Three.js,
React, the DOM or Node APIs.

### Module layout

```text
packages/simulation/src
  engine.ts            state, constructor, public API and the per-tick system order
  systems/context.ts   SimContext: the mutable state the engine implements and passes as itself
  systems/model.ts     unit records, templates and tuning constants
  systems/*.ts         snapshot, geometry, formations, movement, bounding, cover, combat,
                       morale, casualties, orders, commands, spawning
apps/game/src
  App.tsx              session lifecycle (start, continue, 3v3, reset) and layout
  hooks/               useAudio, useKeyboardShortcuts, useTestBridge, useSandbox,
                       useExerciseDirector, useOrders
  storage.ts           localStorage for locale, audio and training progress
  ui/Hud.tsx           composes ui/hud/: TopBar, SquadCards, OrderBoard, WeaponCard,
                       CommandRow, IconButton and orderMeta (icons, labels, postures)
  ui/FieldOverlays.tsx target reticle, placement status and cursor hint
  styles/index.css     imports foundation, command-hud, command-deck and
                       overlays-and-menu in cascade order
```

Systems are plain functions `(ctx: SimContext, ...)`. A system calls other systems
directly and never keeps its own state, so the engine's `tick()` call order is the
whole order of play. The stylesheet files are contiguous slices of the former
`styles.css`; move a rule between them only together with the visual baselines in
`tests/e2e/visual.spec.ts-snapshots/`.

### Cover slots

`packages/shared/src/cover-slots.ts` derives each cover's slots from its footprint
(`coverSlots`): both long faces of sandbags, stone and low walls about 1.2 m apart,
the trench floor, one per barrel side, building corners and walls. Slot ids are
`coverId * 64 + index`; slots off the path grid or inside a blocking footprint are
dropped (`allCoverSlots`, cached per cover set). `planCoverSlots` assigns free
slots on the side away from the threat, closest soldier-slot pairs first; the
simulation (`systems/slots.ts`) and the preview both call it, so the preview shows
the slots an order takes. Units hold `slotId` (hashed state); `maintainSlots`
releases it on a new destination, a fall, rout or removed cover, and a settled
slot holder does not give way in `separateUnits`. Buildings live in one
`BUILDINGS` table in `shared/world.ts`: the training cover set adds them as
`building` cover and the view places their meshes from it. Hovering cover draws
its slot markers (free, taken, planned) and a free count (`coverSlotView`).

### Bootcamp stations

Stations are data in `packages/content/src/bootcamp-exercise.ts`; each objective
has a kind with one pure evaluator in `apps/game/src/training/objectives.ts`
taking the frame, per-objective memory, the tick delta and the HUD input
(recorded actions, selection size). The director in `training/exercise.ts` runs
the objectives in order, sends objective start actions (training troop advance,
release fire, withdraw, instructor out) as commands, applies line and cohesion
failures only while their objective is active, and skips the frame that still
shows the previous station. In the simulation, training stations can pin the
instructor or let it follow the section (`updateInstructorFollow`), start
casualty drills, and training enemies are only engaged on an explicit order
(`mayEngage`).

### Training ground

The bootcamp map is data in `packages/shared/src/training-ground.ts`: station
entries and areas, covers, buildings, trees (sight obstacles), roads and the
parade ground (terrain features), the fence and small props. The simulation
(`map: 'training-ground'`, the default for a training engine) and the view
(`WorldLayer('training')` for the countryside, `TrainingLayer` for buildings
and props) read the same tables, and the station points in
`bootcamp-exercise.ts` are `stationPoint(id, offset)` from it. Every station
shares one local layout (`STATION_OFFSETS`), which the objectives were tuned
on. Everything stays inside the 200 m pathfinding grid. Terrain queries read
the active terrain (`setActiveTerrain`): the engine selects its map's terrain
before every tick and the scene view when it is built. `map: 'training-kit'`
keeps the earlier layout around the origin for the battle lab and the
mechanics tests.

### Section movement

Orders that place several soldiers match destinations to soldiers by minimum
total distance (`matchDestinations`, a Hungarian assignment), for formation
slots, line slots and the final cover slots alike, and the preview runs the same
matching; with Euclidean cost the straight routes never cross. A gathered
section (all within 15 m) going at least 12 m follows one route
(`sectionRoutes`): the path from its centroid, each soldier keeping its place in
a body compacted to 5 m, then spreading to its own destination near the end.

## Determinism

- Fixed tick: 100 ms (10 Hz).
- Seeded xoshiro128** RNG owned by the simulation.
- FNV-1a state hash over the authoritative world state (units, faction, stance and
  RNG state). The tick counter and presentation order metadata are not hashed.
- Commands are applied at the start of a tick in arrival order; rejected commands
  emit `command_rejected` and leave the world unchanged.
- `OrderManager` owns the command-to-soldier boundary: it rejects empty, unknown
  and exclusive states (dead, routed, carried, panicked or incapacitated) before
  the engine mutates a unit. Order priority and task contracts live beside it.
- The simulation is headless and tested through the headless runner.

## Presentation

- The worker owns the simulation; the main thread keeps a read-only `ClientMirror`.
- `CameraRig` is an orthographic camera with tactical, transition and strategic
  bands, 40â€“45Â° tactical tilt, top-down strategic view, pan/rotate/zoom and texel
  snapping. The span is 25â€“200 m.
- `PixelPost` renders the scene into a ~300 px-high target and applies the strong
  look (outline, bloom, grade, posterized dither, vignette) or the clean mode.
- `CharacterLayer` draws 1.75 m procedural low-poly proxies as a part rig with
  articulated hips, knees and boots, layered tunic, belt, bandolier, canteen,
  bedroll, pack, face and faction headgear. The officer adds a peaked cap,
  sash and map case. Units scale by `max(1, span / 60)` at strategic zoom.
- Facing uses shortest-angle smoothing. Walking uses a distance-based stride,
  knee bend, torso lean, head stabilisation, weapon sway and body bob. Stance
  (`standing`, `crouched`, `prone`) is authoritative simulation state; the view
  blends the body pose and
  changes the ring colour, while the ring and shadow stay flat on the ground.
- `PathLayer` draws `Frame.orders` as one dynamic dashed `LineSegments` buffer
  with waypoint crosses and target rings.
- The reference HUD stays at native resolution and uses a segmented top rail,
  squad/weapon/command cards, rounded translucent sepia panels, Cinzel headings and
  Barlow/Barlow Condensed data. Icon controls expose localized hover/focus
  infoboxes; no font or icon is fetched from a CDN.
- planOrderPreview, cover-first destination selection and the defend-region clamp
  live in a pure shared planner used by both the simulation and the presentation
  preview.
- PreviewLayer draws ghost destinations, planned paths and facing cones; the
  overlay is off until the Preview control is enabled.
- The HUD can be hidden with the Hide HUD button or H; a floating Show HUD control
  restores it without resetting the session.
- A presentation-only ShotAudio manager synthesizes one original distant gunshot
  buffer on the first start gesture, plays it from `shot` events, deduplicates by
  tick/source/target and caps concurrent voices. Mute and volume persist locally;
  the simulation and worker never see audio.
- The bootcamp uses a presentation-side exercise director over frames. It evaluates
  reach, suppress, secure, hold and protect-officer objectives, sends phase setup
  through the command boundary and stores progress in `prestes.bootcamp.exercise.v1`.
- The exercise has three phases: assembly, assault and hold. Training enemies use
  non-lethal fire and a training-only role; the simulation can reset a phase
  checkpoint for resume and local retry without restoring arbitrary unit snapshots.
- The training field reuses deterministic simulation covers and spawns; a view-only
  TrainingLayer adds tents, sheds, fences, roads, crates, vegetation and zone,
  approach and fallback markers. Ground orders and their previews take reserved
  cover slots (see Cover slots), and a deterministic separation pass keeps living
  soldiers at least 1.2 m apart.
- The training scenario flag remains separate from `sandbox`; target dummies stay
  in the sandbox. Both-sides and sandbox tools remain available for mechanics testing.
## Tactical core

- Units belong to sections; frames expose health, ammunition, morale, alive,
  suppression, cover and outcome.
- Alive units auto-acquire enemies inside a 65-degree forward vision cone when
  line of sight is clear, and fire deterministic rifle shots. Range, accuracy,
  cadence, damage, suppression and reload come from the equipped `WeaponProfile`
  in `packages/shared/src/weapons.ts`.
- The sandbox starts every unit with the Mauser 7 mm: 5-round magazine and
  15-round reserve. Shots consume magazine rounds; an empty magazine reloads from
  reserve. `docs/history/WEAPONS.md` separates documented identity from abstracted
  game values.
- Cover is directional. A sandbag only protects when its volume lies between the
  unit and the threat; low cover requires crouch/prone. Blocking cover blocks
  line of sight and movement.
- Morale and suppression are separate. Fire raises suppression and lowers morale;
  cover reduces both. Suppression decays, and morale states are steady, suppressed,
  pinned, panicked and routed. A pinned soldier is forced crouched or prone,
  seeks cover and cannot fire until the state clears.
- Uncovered suppressed units drop stance; pinned units seek retrograde cover or
  hunker; panicked units ignore player orders, flee to the nearest map edge and
  become routed. Routed units are hidden and do not count as combat-effective.
- Victory/defeat is frame metadata and counts combat-effective units; the HUD shows
  cover, suppression, state, objective and outcome.
- TracerLayer draws short shot lines; dead characters lie down without a ring.
- Units face their target while firing and their path while moving. When idle
  and no target or path is active, an Aim order supplies the section facing;
  without one they keep their last facing. An explicit attack order turns the
  soldier toward the target. Sight-blocking cover therefore interrupts both
  detection and fire.
- Idle units do not auto-advance. After an order arrives, eligible soldiers seek a
  reachable physical cover position; the search is allowed to put the cover between the
  soldier and the threat and is disabled for explicit hold/withdraw/flank/pursue/flee.
  Clicking directly on a wall is valid: the group spreads into distinct positions on
  the side opposite the section facing (or Aim direction), so a section looking north
  takes cover from enemies coming from the north instead of exposing itself.
- Move orders use A* on a 1 m grid around blocking cover; path layers draw the
  actual waypoint route.
- The opening deployment is outside rifle range. Units hold in place and do not
  auto-advance; they acquire and fire only when a visible target enters range.
- Auto-cover moves an idle unit with a visible target to a sandbag with line of
  sight and crouches it unless the player locked the stance.
- Targets are scored by distance, cover, suppression, officer rank and allies
  already engaging; exposed and unengaged enemies rank higher.
- One unit can flank a covered target while an ally pins it; suppressed units seek
  retrograde cover or hunker down. Attack orders advance from cover to cover,
  or directly when no cover is available, and fire on the move. Suppression
  holds position, and enough suppressive fire pins the target. Section moves
  spread into perpendicular slots.
- The compact bottom command deck is presentation only. It shows section cards,
  health, ammunition, morale, current order and body stance. Every active order is
  visible at once in Fire, Movement and Troop sectors, using medium icon-only
    square buttons. Passive tactics, body stance, formation and Hold Fire stay
  visible. Tooltips show the action name immediately and the description after
  five seconds. Left-click confirms a selected action; right-click quick-moves or
  attacks. A borderless translucent world callout shows the officer giving the order
  and the section confirming it.
- The start menu is a desk of draggable pixel-art objects over the marching column
  scene: named campaign and compendium books that open into centered full-screen
  spreads, an options compass that opens a centered settings screen, a four-map fan
  whose active sheet carries a printed legend with the deploy action, and a closed
  gramophone that opens a centered screen with the record rack, metadata and
  transport. The old book menu was removed once the desk was accepted
  (add-menu-desk 8.3).
- The main experience is the bootcamp: a 240 x 240 m training map with 11 player
  soldiers, a non-controllable officer instructor and a three-phase playable
  exercise. The panel shows mission objectives rather than a permanent checklist.
- Selection is troop-level. Clicking any soldier selects all 11; clicking any enemy
  selects its whole troop. No select-all action exists, including Ctrl/Cmd+A.
- Sandbox placement uses a shared preview pipeline for troops, cover and obstacles,
  with valid/invalid feedback, Z/X rotation and click-to-confirm.
- Aim is computed from the section centroid, and the Aim preview draws a green
  centreline to the first sight blocker and grey beyond it. Terrain height and the
  soldier stance (standing/crouched/prone eye height) are part of LOS; training tents, sheds and trees are shared sight obstacles.
- Drag formations send move_line; slots are distributed along the segment and
  snapped to nearby cover. Left-drag with Move pending and right-drag both draw the
    line. Alternating movement is a toggle: when on, point Move, attack, area and
  pursuit orders bound in two halves; when off, the section advances together.
  Drawn-line moves stay whole and preview LOS from each final slot, perpendicular to
  the line; dragging right and left select opposite facing sides. Line, column, wedge
  and free formations feed the group slot engine
  and survive a primary-order change. Pursuit re-paths until the target is lost,
  the unit is pinned or fatigue reaches the stop threshold; an ambush fires once
  and becomes a defend order. Cohesion, fatigue and rescue progress are
  presentation only.
- Section portraits are named placeholders until final art exists.

## Terrain

- `packages/shared/src/terrain.ts` defines a deterministic sandbox heightfield from
  a ridge, trench, crater and road. Simulation and view sample the same function.
- `terrainSpeedFactor` combines local slope and surface and multiplies the
  movement step; road is faster, ridge/trench/crater slower.
- `terrainCoverAgainst` adds trench/crater cover or ridge cover when the crest lies
  between the unit and the threat. Sandbag and terrain cover do not stack.
- The view builds a low-poly height mesh at 2 m resolution, colors it by surface,
  raycasts it for ground orders, and places characters, paths and tracers at
  terrain height. Terrain height participates in LOS; terrain is not destructible yet.

## Map documents and the editor (add-map-editor)

Battle maps can also be authored as **map documents** (`*.map.json`,
format `prestes-map` v1, `packages/shared/src/maps/document.ts`): an Int16
height grid in centimetres every 2 m, 1 m paint (ground material) and
vegetation rasters (RLE + base64), and vectors for roads, rivers, ponds,
bridges, ferries, walls and fences, catalog objects and the deployment
zones. `compileMapDocument` is pure and deterministic: it carves river and
pond beds, flattens roads with camber, shoulders and ditches, turns walls,
fences and catalog objects into cover with the battle's rules (every object
has an effect: cover by height, sight blocked at 1.75 m, thin posts see
through, foliage conceals, decals paint the surface) and returns an ordinary
`BattleMap` with a height `grid`, `raster` surfaces and vegetation, `paint`
and `lines`. Both the worker and the view read that one result.

- **Catalog**: `packages/shared/src/maps/authored/*.map.json` are listed by
  the generated `authored/index.ts` (`pnpm check:maps` validates them and
  rewrites the index) and compiled on first use. Skirmish maps are imported
  with the bundle and appear on the menu after the hand-written ones;
  campaign maps are separate chunks that `loadAuthoredMap(id)` fetches when a
  mission asks, so they weigh nothing in the game and worker bundles.
  `fazenda-doc` is the proof map (the Fazenda re-created with editor pieces,
  `pnpm map:fazenda-doc`), filed as campaign so the menu keeps the
  hand-written Fazenda.
- **Playtest**: the editor stores the document in IndexedDB and opens
  `index.html?playtest=1`; the game registers the compiled map
  (`registerBattleMap`) and the `start` request carries the document so the
  worker compiles the same map.
- **View**: maps with `paint` are drawn by `PaintedGround` (40 m chunks,
  world-space nearest sampling of the 5 x 6 ground atlas, Bayer-dithered
  material edges, editor overlays: relief, contours, slope, metre grid).
- **Editor page**: `apps/game/editor.html` (second Vite input), React panels
  around the game's own `SceneView`; state, history and tools live in
  `apps/game/src/editor/` outside React. The dev server's
  `apps/game/vite-map-save.ts` plugin serves "Save to project"
  (`POST /__editor/save-map`, validated, fixed folder); the built game has no
  such endpoint. User notes: `docs/map-editor.md`.

## Troop control

The full infantry command, movement and concurrency contract is in
`docs/design/INFANTRY_COMMAND.md`, backed by the `orders`, `casualties` and
`formations` capabilities. The phased execution plan and metrics ledger live in
`docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md`.

- The player troop is 11 riflemen in one section, with a non-controllable officer instructor.
- Clicking any friendly unit selects the whole troop. A marquee dragged left is a
  blue all-troop selection; dragged right it is a green soldiers-only selection.
- The officer regenerates morale for nearby allies and always seeks cover.
- With alternating movement on, the Flank command splits the selected troop: the
  first half suppresses the target while the second half flanks. With it off, the
  whole group flanks together. Flank candidates prefer cover and the group commits
  to one side of the target.
- Cohesion tracks spacing and officer proximity, slows movement when low and keeps
  auto-cover near the squad centroid. The HUD has no Select All button; Ctrl/Cmd+A
  remains as a keyboard shortcut.
- Withdraw prefers the highest-cover defensible position away from the nearest
  enemy, with a direct retreat fallback.
- Blocking cover volumes stop movement and pathfinding; high cover also blocks
  line of sight. The central house has been removed and replaced by walls,
  barrels, low walls, sandbags, a trench and terrain elevations.
## Sandbox lab

- `F1` opens a read-only inspector for the selected active unit, plus one-tick
  step and reset. Reset recreates the client with the same seed.
- `Frame.covers` is the simulation-owned cover list. Sandbox spawns add sandbag,
  stone or trench covers; the scene reads the same list and raycasts terrain for
  placement.
- Target dummies are stationary `dummy` units in the `target` faction: shootable,
  targetable by the player, ignored by AI and outcome, and rendered as target
  boards.
- Spawn commands are rejected outside sandbox mode, so missions cannot use them.
## History

Historical content is governed by `docs/history/SOURCE_POLICY.md`. Macaulay is the
chronology baseline; Amado supplies tone; Blanc supplies social and interior
history. Book scans and OCR text live under `livros/` and are gitignored.
































