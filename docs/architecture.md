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
  approach and fallback markers. Ground previews choose cover even without a threat,
  reserve one cover position per soldier, and a deterministic separation pass keeps
  living soldiers at least 1.2 m apart.
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
- The start menu uses the supplied Coluna photograph as a full-bleed hero, with a
  slow Ken Burns drift, film grain, light sweep, vignette and reduced-motion fallback.
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
































