## Context

- The editor already writes map documents (`*.map.json`) to
  `packages/shared/src/maps/authored/` through the dev server
  (`apps/game/vite-map-save.ts`), and `tools/check-maps.ts` regenerates
  `authored/index.ts`. Documents carry `use: 'skirmish' | 'campaign'`, a
  setting label and a source note. Skirmish documents are imported into
  the bundle (`AUTHORED_SKIRMISH_DOCUMENTS`), campaign ones are loaded on
  demand (`AUTHORED_MAP_LOADERS`), and `loadAuthoredMap` exists but the
  game never calls it.
- The catalog (`maps/catalog.ts`) starts with the four hand-written maps
  (`vila-militar`, `fazenda`, `serra-rio`, `bairro`; about 20 KB of the
  simulation worker) and `DEFAULT_BATTLE_MAP = 'vila-militar'`. About 40
  test files, the e2e suites, `check-determinism`, `battle-report`,
  `sim-bench`, `map-review` and the menu art (`deskArt.ts`, previews in
  `apps/game/public/maps/`) name them. The proof map `fazenda-doc.map.json`
  is 63 KB.
- The playtest already sends a whole map document to the worker in the
  start message (`GameClient` option `mapDocument`), which compiles and
  registers it there.
- The campaign book's chapters come from `packages/content/src/campaign/chapters.ts`
  (`CAMPAIGN_CHAPTERS`: id, number, `playable`, `missionId`), in the order of
  docs/campaign/CAMPAIGN.md; titles are localized in the chapter text.
- The battle view aims one directional light per palette
  (`SUN_BY_PALETTE` in `scene-view.ts`) and bakes a hillshade into the
  terrain's vertex colours from that sun (`hillshade(terrainGeometry, …)`).
- Boundary: the simulation never imports Three.js, React or the DOM; the
  time of day lives in the map document and the view only. The kernel is
  deterministic (fixed 100 ms tick, seeded RNG, `hashState()`); the map's
  gameplay data feeds it, its lighting does not.

## Goals / Non-Goals

**Goals:**
- Slots: each map is a campaign mission's (one per chapter) or a skirmish
  map; the editor asks the slot on New and groups Open by slot.
- The game lists only authored maps; an empty list says so.
- No map document in the worker bundle: maps load when chosen.
- One test map carries every test, report, golden, bench and e2e.
- Time of day and sun direction per map, previewed in the editor.

**Non-Goals:**
- Objectives (`add-map-objectives`, reworked next), mission scripting,
  briefings, campaign progression and saves.
- Any change to vision or rules by time of day (no night fighting).
- Redrawing the generated maps as documents (the user authors new maps).

## Decisions

### 1. Slot data in the document

- `MapDocument` gains `mission?: string` (a `CAMPAIGN_CHAPTERS` id), required
  when `use === 'campaign'`; `use` gains `'test'`. Document version goes up
  by one; older documents load with `mission` absent (a campaign document
  without it is listed as "no mission" and must be moved to a slot before
  saving) and with the default time of day.
- The slot list is `CAMPAIGN_CHAPTERS` in book order: the editor (which
  already imports `@prestes/content`) shows "NN Title" from the chapter
  number and localized title. One map per mission is checked on save
  (the dev server lists the folder; `check-maps` fails on two documents
  with one mission).
- Campaign file names stay the map id (the author's choice); the mission
  link is the field, so renaming a map never breaks its chapter.
- Alternative considered: one file per mission named by the mission id.
  Rejected: it couples the file to the slot and makes moving a map between
  slots a rename.

### 2. Authored maps load on demand; a light index is bundled

- `check-maps` generates, besides the loaders, an `AUTHORED_MAP_INDEX`:
  id, use, mission, size, localized name and description, and whether a
  preview image exists. Only the index is in the game bundle; every
  document (skirmish, campaign, test) is a dynamic-import chunk.
- Starting a battle on an authored map: the menu awaits
  `loadAuthoredMap(id)`, then starts the client with `mapDocument` (the
  playtest path), so the worker compiles it. The worker bundle carries the
  map pipeline but no map. Tools and tests in Node call `loadAuthoredMap`
  directly before building the engine.
- `battleMaps()` becomes index-driven for the menus; `battleMap(id)`
  stays synchronous for maps already loaded (tests load first).
- Alternative considered: keep skirmish documents in the bundle. Rejected:
  at ~60 KB a map, three user maps would break the 200 KB worker budget.

### 3. The generated maps leave; the test map replaces them

- Delete `vila-militar.ts`, `fazenda.ts`, `serra-rio.ts`, `bairro.ts`, their
  previews and `fazenda-doc.map.json`; the `BattleMapId` union becomes a
  string id from the index. `kit.ts` stays only if the test map's generator
  uses it.
- The test map `campo-de-provas.map.json` (`use: 'test'`, medium size) is
  produced once by `tools/make-test-map.ts` from code (so its layout is
  reviewable and reproducible), then committed and editable in the editor
  like any document; the tool is kept to rebuild it on purpose only.
  Layout, column in the south, legalists in the north, about 260 m apart:
  - near the column: a casa-térrea and a sobrado on a lane, a walled yard;
  - the middle: open fields crossed by two stone walls and a fence, a
    stream east-west with a ford and a plank bridge;
  - near the legalists: the matriz with its tower on a small praça, a
    farmhouse, and a fire trench line in front of their area;
  - open ground left free beside the praça and the ford for objectives.
- `DEFAULT_BATTLE_MAP` becomes the test map; the menu never defaults to it
  in the published build (it is not listed there).
- Compendium entries `map-fazenda`, `map-serra-rio`, `map-bairro` describe
  places and stay; their links to the removed maps are dropped and
  `check-content` stops requiring a map per entry.

### 4. Tests, goldens, reports and bench move to the test map

- `check-determinism`: the 3 vs 3 cases run on the test map (the default
  and the mixed-roster ones); the goldens are re-recorded once with the
  reason "maps moved to the test map".
- Simulation tests that need a specific feature (garrison house, tower,
  trench, ford) find it on the test map by kind instead of by map
  coordinates; tests written against map-specific numbers are rewritten to
  the test map's features. `packages/shared/test/fixtures/test-map.ts`
  stays for unit tests that build a tiny map in code.
- `battle-report`: default map the test map; `--map <id>` reports any
  authored map without bands (the author's review). The known stalls of
  the old maps (`STALLED_UNTIL_OBJECTIVES`, `LONG_UNTIL_OBJECTIVES`, the
  Bairro gun's bursts) are dropped with those maps; the test map must meet
  the bands, or the gap is recorded and brought to the user.
- `sim-bench`: the per-map loop runs on the test map, plus one run with
  every column section ordered into a building (the 5.2 stress case).
- e2e: suites that pick maps (`battle-maps`, `desk`, `garrison`,
  `performance`) use the test map or a fixture skirmish map written by the
  test into a temporary authored folder; the menu tests cover the empty
  state.
- Bundle budget: the worker back to 200,000 B.

### 5. Time of day

- `MapDocument.light?: { time: number; bearing: number }`: `time` in hours
  from 6 to 18 (default 12), `bearing` in degrees, the compass direction the
  sun shines from (0 north, clockwise; default 45).
- The view computes the sun: elevation from the time (about 12° at 6 h and
  18 h, about 70° at noon; a sine over the day), azimuth from the bearing,
  intensity and colour warmer toward the ends of the day, the hemisphere
  light a little lower then. The same direction feeds the terrain
  hillshade bake, so slopes read in the toon ramp. Palettes keep their
  ground colours; `SUN_BY_PALETTE` becomes the default when `light` is
  absent.
- The editor's map properties dialog edits both with sliders; while it is
  open the editor view relights live (the editor already uses the game's
  renderer); undo records one command per dialog apply.
- The simulation does not read `light`; `hashState` excludes it. A test runs
  the same battle with two lights and compares hashes.

### 6. Campaign book play action

- A chapter whose mission has an indexed map shows "Jogar o mapa" / "Play
  the map"; it loads the document and starts the 3 vs 3 with the default
  rosters, the same start as the skirmish. `playable` keeps its meaning
  (a scripted mission exists) for later changes.

### Historical method and figures

No new historical claim. Campaign maps keep the setting label and source
note required on save; their places are game abstractions of the sources
cited by each mission document. The figure roster is unchanged; each
mission keeps the commander its document names.

## Risks / Trade-offs

- [The test map may not meet the battle feel bands] → Its layout follows
  the bands' needs (cover on each axis, lines near each area); if a band
  still fails, record it and ask the user before relaxing anything.
- [Large test rewrite (~40 files)] → Tests look features up by kind on the
  test map; map-specific numeric tests are replaced, not ported.
- [Async map loading on start adds latency] → Documents are small chunks;
  the deploy button shows a short loading state.
- [A user map without enough cover makes the enemy line weak] → The map
  check warns (cover gap, cover for fewer sections than deploy).
- [Removing maps loses tuned content] → It is in git history (commit
  7dc9098 and earlier); nothing is published.

## Migration Plan

1. Format: `mission`, `light`, `use: 'test'`; index generation; on-demand
   loading through `mapDocument`.
2. Test map built and committed; default map switched to it.
3. Tests, tools, goldens and e2e moved; generated maps and `fazenda-doc`
   deleted; bundle budget restored.
4. Editor slots, Open by slot, time of day; menus from the index; campaign
   play action.
Rollback: git revert; no user data outside the repository.

### 7. Specs that name the old maps

About 18 requirements in other capabilities use the old maps in their
scenarios (garrison, terrain, bootcamp, weapons, force-roster, battle-lab,
battle-maps). The deltas here cover the catalog, the budget, shading, cover
axes, the report and defensive lines; task 6.0 rewrites the rest to the test
map once its layout is fixed (2.1), so scenarios can name its real features.

## Open Questions

- None blocking. The test map's exact layout is reviewed with the user on
  first playtest (the garrison hand check moved from garrison-and-assault
  5.4).

## Apply findings

- **3.1 test map layout (2026-11-09).** The first layout gave the legalists no
  line within `ANCHOR_REACH` (40 m) of their points, so the enemy commander
  stood in the open. The legalists now deploy at y −75 (column y +95, 170 m
  apart) with the fire trench 20 m and two sandbag rows 13 m before their
  points; the church moved to (70, −40) on its rise. The stone walls (y 32)
  and the picket fence (y −20) have 6 m gates every 60 m or so: a line across
  the whole field sent every route round its ends.
- **3.1 order preview cost on walled ground.** With the pointer just beyond a
  long wall (the column's side walled off from the point), A* fills the walled
  pocket: about 6,000 expansions per section route, 6–7 ms for an advance
  preview of three sections, against the 2 ms of tactical-preview "Preview
  cost". On open ground on the near side it is under 2 ms, where the test now
  measures (y 42). This is not new (any authored wall does it) but authored
  maps will have more walls. Not fixed here; candidates: a coarse
  region/portal graph over the 1 m grid, or capping the preview's section
  routes and drawing a straight guide beyond the cap. Raised with the user.
- **3.1 open-field tests.** Tests that measure sight or contact on open ground
  (`vision.test.ts`) use a flat empty map (`packages/simulation/test/open-field.ts`)
  instead of the default map, so they do not depend on the test map's layout.
- **3.1 walled yards from walls (the user's choice, 2026-11-09).** Garrison
  yards existed only as the Bairro's hand-written `garrisonYards`. The
  compiler now finds them from authored walls (`maps/wall-yards.ts`): walls
  1.5 m or taller whose ends come within 12 m of each other form a group; a
  group whose walls run along at least 70 % of its outline (convex hull), of
  at least 60 m² and at most 80 m across, is a yard holding up to 12 men (no
  more than its ports). `yardPosition` no longer takes the far end of a wall's
  own piece, or an end joined to another wall, as a gate's side. `check-maps`
  now also runs `validatePositions` on authored maps (the church door first
  sat on the picket fence).
- **3.1 road ditch cover on authored maps.** Authored ditch pieces (12 m)
  had a 2 m cover radius, so a man more than 2 m along a piece from its middle
  had no shelter. The radius is now the half length plus 1 m, as on the
  Fazenda's hand-written ditches.

- **Desk and thumbnail (5.2, 5.4).** The desk fans one sheet per authored skirmish map (`loadSkirmishMaps`/`skirmishMaps` in the shared catalog; the test map only with `includeTest`, which the game passes on the dev server). The editor's "Use view as thumbnail" writes the map preview the desk and the setup screen show (`POST /__editor/thumbnail`); rewriting the index makes Vite reload the editor once, and the autosave restores the map. An authored map's name comes from its own text (`mapText`), not a message key.
- **E2E coverage lost with the generated maps (3.5).** The ferry crossing (and its HUD count), the canefield concealment and the "Revelado" capim tests ran on Serra e Rio and the Fazenda; the test map has a ford but no ferry, cane or capim, so these e2e tests are removed. The simulation keeps its concealment and reveal tests on small fields (open-field.ts); the ferry has no map until an authored map carries one. The performance probe now runs on the test map, without crops. Adding cane and capim strips to the test map would bring the HUD checks back; that changes the test map (and the goldens of 3.2), so it waits for the user's call.

- **Vegetation density (look only), asked by the user while authoring.** Capim clumps read sparse, and the user asked for a per-patch "aglomeracao". The vegetation brush gets a density select (normal / sparse / dense). The editable cell byte keeps the kind in its low four bits and the density in bits 4-5, so old maps read as normal. Compile strips the density from `raster.vegetation` (the simulation, concealment and the hash are unchanged) and emits an optional `raster.vegetationDensity` for the view. `plant-meshes` walks the field grid at half steps: whole steps are the normal look, dense adds the half steps (about 3-4x for capim and scrub, 2x along corn rows) and sparse drops about half. Tests: view3d plant-meshes (counts and document round trip), plus the editor e2e "vegetation density".

- **Bridges read as embankments (user screenshot, 2026-11-09).** The tasks are in section 7. Probable causes: the bake clears water and paints a riverbed-coloured `'bridge'` surface under the deck; the ground under the span is only lowered to deck - 0.4 m; the deck is built from 1 m pieces, each tilted on its own. Any change to the water raster under bridges may change the simulation hash. Prefer keeping the simulation's view (deck walkable, no water cost) and changing only the drawn water and ground; if that is not possible, re-record the goldens with a recorded reason.

- **3.4 the test map is over the 3 ms tick budget (2026-11-10).** `pnpm bench --budget` now runs on `campo-de-provas`: the plain 3v3, the heavy mixed rosters, and a stress run where each column section is ordered into the nearest building. Two runs gave 3.52 / 3.50 / 3.61 ms and 3.39 / 3.86 / 3.76 ms a tick (CPU time, hashes stable). The old maps passed at 3 ms (the Bairro's rostered run had 4.5). Brought to the user, who chose (2026-11-10) a test-map budget of 4.5 ms (the Bairro's heavy rostered run had the same): the test map packs every garrison kind and dense cover near the column. Skirmish maps keep 3 ms. A third run: 1.62 / 3.68 / 3.89 ms, within budget.
- **4.3 undo did not re-aim the sun.** `SceneView.replaceBattleMap` reused the painted ground without calling `aimSun`, so undoing a light change left the view lit by the undone light. Fixed; the editor e2e "time of day" covers it.
- **2.2 the sandbox panel skipped the test map.** It listed `battleMaps()`, which keeps only skirmish documents. `sandboxMaps()` lists the test map first once loaded.
- **8 Section starts from the area (user, 2026-11-10).** The editor showed both section points and areas; the user asked for the areas only. The points still seed the six start slots, the enemy commander's anchors, the map checks and the camera, so the compiler derives them. First try (1/6-5/6, set back 10 m from the front edge) moved the starts forward, so a new map failed zones-too-close (150 m < 160) and the enemy left its trench line; the final rule follows the hand-placed convention (middle of the depth, 1/5-4/5, rounded, west to east), which reproduces the test map's points exactly. The battle maps spec still speaks of an area "that holds that side's section points": it holds by construction now.
- **3.3 the gun bands fail on two test-map presets (2026-11-10).** The battle report now runs on the test map. The "ends with an outcome" band passes on seeds 1922, 7 and 42 with the default rosters (no stall list needed). The weapons report (mixed player with the gun, seed 1922) against the test map's presets: A (three rifle sections) 900 s, no outcome, gun 66 rounds / 11 bursts / 3 hits, set 0.72 (passes); B (comando, metralhadora, two rifle sections) the column wins at 327.5 s, 6/30 casualties, gun 48/8/3, set 0.67; C (irregulars and squads) the column wins at 395.6 s, 3/30, gun 48/8/3, set 0.53. B and C fail the 10-burst floor and the 0.7 gun-set band (GUN_SET_BAND) because the battle is decided early. Brought to the user, who chose (2026-11-10) to hold the gun bands only in a battle that lasts 600 s or more (LONG_BATTLE_SECONDS in the weapons test); the machine-gun-fire-feedback battle-lab delta now says so.
