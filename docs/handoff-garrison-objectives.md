# Handoff: author-game-maps (current) → add-map-objectives

Written 2026-11-09 so any agent (or another AI model) can pick the work up
cold. Keep this file current as tasks close; delete it once
`add-map-objectives` is archived. The older sections below are history.

## Session 2026-11-10 (Opus, stopped to save tokens)

Done and marked: **2.2** (sandboxMaps + skirmish-catalog.test.ts + sandbox
e2e), **3.2** (determinism on the test map, golden `reason`), **4.3**
(editor e2e "time of day"; fix: replaceBattleMap re-aims the sun).
author-game-maps is now 13/31.

Open, in this order:
1. **3.4 done** after the user chose a 4.5 ms test-map budget
   (`TEST_MAP_BUDGET_MS` in tools/sim-bench.ts). author-game-maps 14/31.
Later on 2026-11-10: **5.1** done (screenshots shared), **5.2** done
(desk e2e with a routed empty index). author-game-maps 16/31. Next: 3.3,
3.5, 3.6, 5.3, section 7, 6.x.

2. (done) **5.1** only lacks the screenshots of the test map in the battle view at
   7 h and 17 h (set `light` in a copy of the document or use the editor's
   3D view on campo-de-provas through Playwright, never the shared pane).
3. (done) **5.2** e2e (empty sheet needs an index with no skirmish map: route or
   stub `AUTHORED_MAP_INDEX`; a fixture map deploys).
4. Then 3.3, 3.5 (visual baselines, coordinate with the HUD session), 3.6,
   5.3, section 7 (bridges), 6.x.

Another session edits files in this tree at the same time (scene-view.ts,
editor.spec.ts changed on disk mid-session); read before editing.

## Where things stand (updated 2026-11-09, end of session)

- Branch `refine-battle-maps`. **Nothing committed since `7dc9098`**; all work
  is in the working tree. Commit only when the user asks. Never push,
  merge, rebase or force-push (CLAUDE.md). The project stays local: no
  remote, no Pages.
- garrison-and-assault and add-run-toggle are archived. Active changes
  (`npx openspec list`): **author-game-maps 10/25 (current)**,
  add-map-objectives 0/17 (to be reworked next, after author-game-maps),
  machine-gun-fire-feedback 12/13 and polish-menu-desk 30/34 (other
  sessions), video-tutorial-manual 0/19, retire-bootcamp complete
  (not archived).
- **The user is authoring maps in the editor right now** and asks for
  editor/look fixes as they find them. Treat those requests as first
  priority, then return to the tasks. Record each in author-game-maps
  `design.md` "## Apply findings".
- Do not paint or edit in the editor inside the shared preview pane: the
  editor autosaves to IndexedDB (shared across tabs) and would overwrite the
  user's map. Verify editor changes with Playwright (isolated context).

### author-game-maps: next steps, in order

Every open task in `openspec/changes/author-game-maps/tasks.md` has a
"Status" sub-bullet saying what is built and what is missing. Short version:

1. **4.3 / 5.1 (lighting), implemented, needs tests:** editor e2e for the
   sliders (`map-light`, `map-light-time`, `map-light-bearing`) plus undo; a
   view test (sun at 17 h from the west lights west faces more than
   midday); a simulation same-hash test for two lights; screenshots at 7 h
   and 17 h shown to the user. Then mark both.
2. **5.2 (desk fan), implemented:** add the e2e from its verify, then mark.
3. **5.4 (thumbnail), implemented and tested:** mark after the user's hand check.
4. **3.5 (e2e on the test map), mostly done:** visual.spec has 4 failing
   baselines and the editor pixel-art screenshot changed (the toolbar grew).
   The HUD session `local_ab470961-e164-4068-8fef-5d9a7672a40b` ("Battle
   HUD") waits for a go-ahead before re-recording the visual baselines;
   message it before and after every Playwright run. If you cannot
   message sessions, ask the user to coordinate.
5. **Section 7, bridges (new, asked by the user with a screenshot):** the
   bridge reads as an embankment. Tasks 7.1 to 7.6 hold the causes found in
   code. Start with 7.1 (repro on the test map) and show the user
   screenshots before and after.
6. **2.2:** the catalog unit test by build flag, then mark.
7. **3.2** determinism goldens, **3.3** battle-report, **3.4** bench,
   **3.6** remove the four old maps, **5.3** campaign "Play the map",
   **6.0** spec scenarios naming removed maps, **6.1** docs, **6.2** gates,
   **6.3** user hand check.

### Built this session outside the task list (all asked by the user while authoring)

These are in design.md Apply findings and covered by tests:

- Editor zoom-out: `SceneView` option `maxSpanFactor`, 2.5 in the editor.
- River stretches: per-stretch deep/ford select on a selected river.
- Tree scatter: the author chooses the species (`settings.treeMix`).
- River look: flat stretch ends, the bed eases deep/ford over 6 m, shoal
  bands, banks on fords, no reed cones (they read as pines), smaller
  stones, and a ford that is lighter and more translucent.
- Vegetation density per painted patch (normal/sparse/dense), the look only:
  the cell byte is `kind | density << 4`; compile strips the density into
  `raster.vegetationDensity`; `plant-meshes.ts` reads it.
- Test map: `campo-de-provas`; rebuild with `npx tsx tools/make-test-map.ts`.

### Practical gotchas

- In Bash, heredocs with apostrophes or non-ASCII break inline Python. Write
  the script to a file with the Write tool and run it.
- Vite once served an empty module read mid-write. `touch` the file and reload.
- The simulation vitest can fail intermittently when run alongside other
  suites; rerun alone before investigating.

## How to work (the user's rules)

- Reply to the user in **Portuguese (PT-BR)**. Code, docs, specs and commit
  messages are in English.
- For each task: read the change's `proposal.md`, `design.md`,
  `specs/**/spec.md` and `tasks.md`; implement; run the task's `verify`;
  then mark it in `tasks.md`:
  ```
  - [x] 4.3 <task text unchanged>
    - Apply note: <what was built, where, which tests, results>
  ```
  Mark a task only when its behaviour is fully done. Record surprises,
  readings of the spec and user decisions under `## Apply findings` in the
  change's `design.md` (one bullet per task, `- 4.3 (...): ...`).
- **Pause and ask the user** on design issues; never narrow, defer or drop
  specified behaviour silently. If the user decides something, record it in
  spec/design/tasks ("Decision (user, date): ...").
- Gates: `pnpm typecheck`, `npx eslint .`, `npx vitest run --maxWorkers=4`
  (more workers starve the long simulation tests), `pnpm check:locales`,
  `pnpm check:content`, `pnpm check:maps`, `pnpm check:determinism`
  (`--update` only with a recorded reason when the simulation changes on
  purpose), `npx playwright test [file]`, and
  `openspec validate <change> --strict`.
- Before using the game preview, mute it: in the page,
  `localStorage.setItem('prestes.audio.v1', JSON.stringify({muted:true,volume:0.35}))`.
- Throwaway checks go in `tools/_x.ts` or `packages/simulation/test/_x.test.ts`;
  delete them after. The simulation must not use `Math.hypot` (determinism).
- Another Claude session ("Battle HUD", HUD windows work) shares the dev
  server on port 5173. If you are that kind of agent, tell it before running
  Playwright; otherwise just avoid running Playwright while it is testing.

## Key code map

- Shared (pure, used by sim and view): `packages/shared/src/maps/openings.ts`
  (doors, windows, upper floors `BUILDING_UPPER`, the church tower
  `buildingTower`), `packages/shared/src/maps/positions.ts` (`PositionDef`,
  `positionsFor`, ports with `level`/`elevation`/`tower`, `towerCapacity`,
  `raisedPorts`), `packages/shared/src/world.ts` `isLineBlocked` (raised
  ends see over covers; `ignoreA/ignoreB` cover ids for men in the tower),
  `packages/shared/src/protocol.ts` (orders `enter`/`exit`, command
  `assault`, frame `garrisons`/`assaults`, `UnitSnapshot.garrison`,
  `elevation`, `entering`), `packages/shared/src/fog-view.ts` (enemy garrisons
  hidden until known; "?" strength).
- Simulation: `packages/simulation/src/systems/garrison.ts` (enter, exit,
  ports, `portScore` post filling, cover, shared suppression),
  `assault.ts` (close assault), `commander-positions.ts` (enemy commander:
  `garrisonOnDeploy`, `dealWithGarrison`, `leaveIfLost`), `vision.ts`,
  `combat.ts`, `deployment.ts` (`applyDeploymentCommand`: commands during the
  deployment phase take effect at once), `enemy-deployment.ts`,
  `enemy-commander.ts`, `engine.ts`, `snapshot.ts`.
- View: `packages/view3d/src/battle-map-layer.ts` (placeholder buildings),
  `character-layer.ts` (men inside hidden, rifle barrels at windows, diamond
  over occupied upper floors/tower), `garrison-layer.ts` (banner with count or
  "?", fit bar, door arrows), `scene-view.ts` (`garrisonMarks()` dev hook).
- Game: `apps/game/src/ui/GameCanvas.tsx` (dev bridges `window.__prestes` =
  `{command, step, frame}` and `window.__prestesScene` = `{focusOn,
  groundToScreen, rangeRing, garrisonMarks, ...}`), `apps/game/src/ui/hud/`
  (`SquadCards.tsx`, `OrderBoard.tsx`, `orderMeta.ts`), locales in
  `packages/content/src/locales/{en,pt-BR}.ts`, order catalog
  `packages/content/src/order-catalog.ts`.
- Editor: `apps/game/src/editor/EditorApp.tsx` (properties panel
  `aside.editor-properties`), `store.ts`, `test-bridge.ts`; e2e under
  `tests/e2e/` (`garrison.spec.ts` is the model for garrison e2e tests).
- Tests: `packages/simulation/test/garrison*.test.ts` (+ `garrison-duel.ts`
  helper), `packages/shared/test/positions.test.ts`,
  `packages/shared/test/elevated-ports.test.ts`, report tests in
  `tests/simulation/`.

## garrison-and-assault: open tasks

Done: 0.1, 1.1–1.5, 2.1–2.3, 3.1–3.4, 4.0–4.7 (see their apply
notes in `tasks.md`). User decisions so far: the enemy commander keeps its
garrison at deployment; report stalls and missing assaults are left to
add-map-objectives 4.1; men in trenches stay drawn; windows on every wall
with front and back doors only (the church: portal plus side doors); **no
roofs, only the tower** (roof posts, `RoofDef` and "Ao telhado" removed);
**no entering during deployment**.

### 4.3 Assault bars: DONE
- See its apply note. The e2e (`garrison.spec.ts`, third test) shows how to
  drive both sides through the bridge: `__prestes.frame()` is the unfogged
  frame, so legalist ids are there; `{type:'move', unitIds, to}` walks men
  (`'advance'` needs a target); poll with `await step(page, n)` inside the
  poll (step pauses the game). The legalist commander's own garrison leaves
  when watched at its doors, so assault a column-held house with legalists.

### 4.4 Section cards "Dentro: <position>": DONE
- `apps/game/src/ui/hud/positionName.ts` names a position (building model via
  `editor.object.<model>`, `hud.position.trench|yard|building`) from
  `positionsFor` over the active map and the frame's covers. `SquadCards.tsx`
  shows `squad-inside-N`; `TroopSummary.tsx` (new `covers` prop) marks helmets
  `inside` / `data-inside`. e2e in `garrison.spec.ts` test 1.

### 4.5 No entering during deployment: DONE (user decision)
- Decision (user, 2026-11-09): nobody enters a position during deployment.
  `applyDeploymentCommand` already refuses `enter`, `exit` and `assault`
  (`not_during_deployment`); `deployment-orders.test.ts` covers it. The
  change carries a MODIFIED delta for `deployment-phase` ("Orders take effect
  at once"), synced at archive. Do not add deployment entry back.

### 4.6 Editor properties panel: DONE
- `EditorStore.positions()` / `positionOf(kind, id)`; `PositionFacts` in
  `EditorApp.tsx`; port ticks `cover-ports` in `viewport.ts`; bridge
  `position()` / `coverPorts()`; e2e in `editor.spec.ts`.

### 5.1–5.4 Close
- 5.1: DONE (determinism matches; report 22/22, assaults 0 as decided; table
  in design.md). Was: `pnpm check:determinism` (re-record only with the reason); battle
  report bands on all maps with assaults counted (`pnpm battle:report`; the
  report tests under `tests/simulation/`). The known stalls stay marked
  (`STALLED_UNTIL_OBJECTIVES`, `LONG_UNTIL_OBJECTIVES`, the Bairro gun's
  bursts) until add-map-objectives 4.1.
- 5.2: DONE (bairro 2.11 ms; with four garrisons 2.16 ms). Was: `pnpm bench`: the Bairro with garrisons under 3 ms a tick. Watch
  `portScore` (line-of-sight checks per port every 10 ticks) if it is slow.
- 5.3: DONE. 5.4 moved to the authored-maps work (user decision). The change
  is ARCHIVED as `openspec/changes/archive/2026-11-09-garrison-and-assault`
  (specs synced: new `openspec/specs/garrison`, `deployment-phase` modified).
  The sim.worker bundle budget is 215 KB until the generated maps leave; put
  it back to 200 KB then. Was: `pnpm verify`, `pnpm e2e` (full; one test can time out under load,
  rerun it alone), `openspec validate garrison-and-assault --type change --strict`.
- 5.4: **the user** plays: clear a street in the Bairro and hold the engenho
  on the Fazenda; write their findings in `docs/status.md`. Ask them; do not
  mark it yourself.
- Then archive the change (the `openspec-archive-change` workflow: sync the
  delta specs into `openspec/specs/`, move the folder to
  `openspec/changes/archive/2026-MM-DD-garrison-and-assault`), with the user's
  go-ahead.

## add-run-toggle

- ARCHIVED as `openspec/changes/archive/2026-11-09-add-run-toggle` (formations
  spec synced). Was: 1.1, 1.2 (2.1) done. 3.1: update `docs/status.md`; run `pnpm check`,
  `pnpm e2e`, `pnpm check:determinism`, `openspec validate add-run-toggle --strict`;
  mark 3.1; then archive (sync specs, move to archive).

## add-map-objectives

Read its `proposal.md`, `design.md`, specs and `tasks.md` first. Tasks:
0.1 (archive prerequisites; add-battle-maps and add-deployment-phase are
already archived, so verify with `openspec validate --specs` and mark),
1.1–1.3 data and authored-map objectives (map document version 4), 2.1–2.6
simulation (protocol, capture, clock and outcome, commander goals, goldens,
clock starts at `battle_started`), 3.1–3.4 presentation (ObjectiveLayer,
top-bar strip and clock, skirmish setup screen time limit and objectives,
end panel), 4.1 battle report (**must** empty `STALLED_UNTIL_OBJECTIVES` in
`tests/simulation/battle-maps-report.test.ts`, `LONG_UNTIL_OBJECTIVES` in
`tests/simulation/battle-feel.test.ts` and restore the Bairro gun's 10
bursts in `tests/simulation/battle-report-weapons.test.ts`), 4.2 gates, 4.3
the user's hand check.

## Progress log

- 2026-11-09: garrison-and-assault 1.3, 1.5, 1.4, 4.0, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3 done; garrison-and-assault and add-run-toggle archived.
- 2026-11-09 (user): new direction. The user authors the game's maps in the
  editor: campaign slots from `docs/campaign/CAMPAIGN.md` (missions 01-08,
  one map each) and skirmish maps; the generated maps leave the menu, one
  test map stays for the tests; objectives authored in the editor, 4 types
  (flag capture/defend with two stages: lower the owner's flag, then raise
  yours; once taken it stays when the men leave; break out to an exit area;
  rescue prisoners; protect a VIP); time of day per map (sun angle, for
  reading the relief). Next: propose these changes (add-map-objectives is
  superseded/reworked).
- 2026-11-09: proposed `openspec/changes/author-game-maps` (slots, on-demand
  map loading, test map `campo-de-provas` carrying tests/goldens/bench/e2e,
  generated maps removed, time of day; tasks 1.1-6.3). `add-map-objectives`
  is to be reworked after it: objectives authored in the editor, four types
  (flag with two stages, break out, rescue, protect), clock and outcome.
  Next: the user reviews author-game-maps, then apply it.

## author-game-maps apply, 2026-11-09 (task 3.1 in progress)

- Default map is now `campo-de-provas`; vitest preloads it (`tests/setup-test-map.ts`). Full vitest 720/720.
- Test map relaid out (legalist line, gates in walls/fence); see design.md "Apply findings".
- Order preview beyond a long wall costs 6–7 ms (budget 2 ms): recorded, raised with the user, not fixed.
- Open question to the user: walled-yard garrison positions exist only as the Bairro's hand-written
  `garrisonYards`; authored maps have no way to make one. Needed before 24 test files move off the old maps.
- 2026-11-09 later: walled yards are detected from authored walls (user's choice); maps carry optional
  `enemyForces`; 3.1, 3.7, 3.8 done; vitest 718/718. Open: editor UI for enemy presets (asked the user).
  Next: 3.2 determinism goldens on the test map.
- 2026-11-09: editor enemy-forces panel done (4.4); undo now drops optional fields. Next: 3.2 goldens.
- 2026-11-09 author-game-maps 4.1, 4.2 done: slot select (apps/game/src/editor/MapSlots.tsx) in New/properties, Open dialog from GET /__editor/maps and /__editor/map?id=, one map per mission (409 mission-taken, replace keeps the old map as skirmish). Tests: tests/tools/vite-map-save.test.ts, editor e2e "slots:" and "open:". Next: 5.2 (skirmish fan from the index), which drops the four generated maps from the menu and so breaks e2e specs that pick them until 3.5.
- 2026-11-09 5.2 and the thumbnail (new 5.4) implemented, NOT marked: the desk fans one sheet per authored skirmish map (test map only in dev, loadSkirmishMaps/skirmishMaps in shared catalog), empty sheet "Nenhum mapa ainda — abra o editor"; SkirmishSetup takes the desk's maps; names from the map's own text (mapText). Editor button "Usar vista como miniatura" (POST /__editor/thumbnail) writes apps/game/public/maps/<id>.png and rewrites the index; it triggers a Vite full reload of the editor (autosave restores). Checked by hand in the preview: thumbnail on the sheet, setup screen, battle starts on campo-de-provas. Missing: e2e for the empty sheet and the thumbnail, vite-map-save test for /__editor/thumbnail, then 3.5 (old-map e2e specs now fail: the menu no longer lists the four generated maps).
- 2026-11-09 (later) Not marked yet, all implemented and checked by hand:
  - 5.2/5.4 tests added (tests/hud/skirmish-desk.test.ts, vite-map-save thumbnail test, editor e2e "thumbnail:").
  - 3.5: e2e specs moved to the test map (battle-maps, desk, garrison, performance, skirmish-setup, cover-slots, deployment, smoke); test map presets reordered (three rifle sections first, so the seeded draw fields 33). Ferry, canefield and capim e2e removed (design.md Apply findings). Still failing: visual.spec 4 baselines and the editor pixel-art screenshot (the editor toolbar grew); coordinate with the HUD session before re-recording.
  - Editor zoom out: SceneView maxSpanFactor, 2.5 in the editor.
  - 4.3/5.1: map properties "Iluminação" (time 6–18 h, sun bearing) with live preview (SceneView.previewLight); the sun follows map.light (packages/view3d/src/map-light.ts). Missing: e2e for the sliders, the view test (west faces at 17 h), screenshots at 7 h and 17 h.
  - User asks: per-stretch shallow (ford) water on an existing river (today the kind is chosen for the whole river when drawing it); pines that appear "automatically" (source not found in code yet: ask which tool).
- 2026-11-09 River stretches: selecting a river shows its width and one deep/ford select per stretch (double-click the selected river to add a point and split a stretch); undoable; editor e2e "river stretches:". The "pines" the user dislikes are most likely the araucárias of the trees tool's atlantic-edge scatter mix (tree-scatter.ts BIOME_MIX): waiting for the user's call.
- 2026-11-09 Tree scatter: the species are now chosen by the author (settings.treeMix; TreeScatter option `species`, `scatterMix`); picking a biome only fills the starting list, and the species buttons toggle in scatter mode. Tests: shared tree-scatter "chosen species", editor e2e "scatter with chosen species".
- 2026-11-09 River look: water stretches end flat (water-outline.ts insideEnds), the bed eases deep<->ford over FORD_TAPER 6 m (document.ts), three shoal bands on the deep side (battle-map-layer.ts shoals), ford colour 0x5f8381 at 0.55 opacity, gravel banks along fords too, smaller stones, no reed clumps. shared/view3d 271 and simulation 303 tests pass. Open question to the user: vegetation density per painted patch, look only or also concealment.

- 2026-11-09: vegetation density per painted patch (normal/sparse/dense), the look only. Cell byte = kind | density<<4; compile strips it into raster.vegetationDensity; plant-meshes reads it. Editor select `prop-vegetation-density`. Recorded in design.md Apply findings.
