# Handoff: author-game-maps (archived) → add-map-objectives (next)

Written 2026-11-09 so any agent (or another AI model) can pick the work up
cold. Keep this file current as tasks close; delete it once
`add-map-objectives` is archived. The older sections below are history.

## START HERE (updated 2026-11-10, end of day: author-game-maps archived)

- **author-game-maps is archived** as
  `openspec/changes/archive/2026-11-10-author-game-maps/` (36/36; the
  user's hand check passed). Its deltas are synced into the main specs
  (+15, ~19, -9); no main spec names a removed map any more (terrain
  hill and garrison scenario fixed after the sync); `openspec validate
  --specs` 23/23.
- **Current change: add-map-objectives (1/17, started 2026-11-10).** 0.1
  done (prerequisites already archived). Plan revised 2026-11-10 for
  authored maps (objectives in map document v5, editor tool, map check; the
  test map's five objectives in design.md). 1.1 done (`Objective` in
  maps/types.ts). 1.3 done (document v5 `objectives`
  and the editor objective tool; see its Apply note). 1.2 done (map check). NEXT STEP: 1.4 (the test map's five objectives, design.md table, saved in campo-de-provas.map.json). Work in small steps, commit each, and
  update this file after each. Open points it inherits: presets A and C of the test map end
  in a 900 s stand-off (objectives should move the column; the gun bands in
  battle-report-weapons wait for it, `STAND_OFF_UNTIL_OBJECTIVES`); defend
  and ambush still face the nearest enemy, seen or not (the AI's defend
  needs a facing of its own before fog can apply there).
- Other open work: machine-gun-fire-feedback 12/13 (gates + the user's hand
  check), polish-menu-desk 31/35 (Aseprite sprites, needs the user),
  video-tutorial-manual 0/19. Wish for later (user): each map as its own
  object on the desk instead of the sheet fan.
- The user's first map `paiolzinho` (skirmish, small) is in
  `packages/shared/src/maps/authored/` with `apps/game/public/maps/
  paiolzinho.png`, untracked; the desk-start-screen baseline now shows it.

The notes below are from finalizing author-game-maps (history).

- Branch `refine-battle-maps`. Last commit `6412ac9` holds everything up to
  the author-game-maps archive (working tree clean). Commit only when the
  user asks; never push, merge, rebase or force-push. The project stays
  local (no remote, no Pages).
- **Next steps to finalize author-game-maps (34/36; open: 5.4 and 6.3, the user's hand checks):**
  1. (done 2026-11-10, see its Apply note) 6.0: MODIFIED deltas (full requirement text, map names replaced by the
     test map `campo-de-provas` features, or REMOVED with a reason) for the
     main-spec requirements that still name the removed maps and are not yet
     in the change's deltas:
     battle-maps: Authored map documents, Map bounds and pathfinding, Period
     look of the battle maps, Roadside ditches, Trench lines in battle;
     battle-lab: Large battle laboratory (default map is campo-de-provas),
     A decided battle ends (test map, seeds 1922/7/42), The winning side
     searches (Fazenda canefield);
     force-roster: Mixed-force deployment (Bairro);
     garrison: Enterable positions (Bairro scenario), Elevated positions
     (Fazenda loft);
     terrain: Ground material drawing (Fazenda snapshot), Map surfaces
     (Vila Militar);
     weapons: Training ammunition load (Vila Militar).
     Already covered by deltas: battle-maps Proof/Fazenda/Serra e Rio/Bairro/
     performance/shading/cover/catalog, battle-lab Map defensive lines.
     Check: `grep -riE "vila-militar|vila militar|fazenda|serra-rio|bairro"
     openspec/specs` after a dry sync; `openspec validate author-game-maps
     --strict`.
  2. (done 2026-11-10) 6.1 docs: docs/status.md, docs/map-editor.md (slots, time of day, the
     test map), docs/architecture.md (maps loaded on demand).
  3. 3.5 + 6.2: `pnpm verify`, `pnpm e2e`. Run 2026-11-10: the vitest step
     of verify failed 6 tests on worker RPC timeouts under load (all 36 tests
     of those files pass alone); build, bundle, determinism, tick budget
     (1.8/1.3/1.4 ms of 4.5), `openspec validate --specs` and
     `openspec validate author-game-maps --strict` pass. Full e2e: 116/122;
     the editor playtest test was stale after section 8 (the start is derived
     from the dragged area, y re-rounds) and is fixed (passes). Still failing,
     were screenshots; re-recorded on the user's word (visual.spec), the editor
     pixel art passes unchanged. 3.5 and 6.2 are done. Known failing: visual.spec
     baselines (desk-start-screen and others) and the editor pixel-art
     screenshot; re-record only with the user's ok or with the HUD session
     (`local_ab470961-e164-4068-8fef-5d9a7672a40b`).
  4. 5.4 done (user saw the thumbnail; wish for later: each map as its own
     object on the desk instead of the sheet fan). 6.3 waits for the user's
     word on garrisons, tower, assault and ford on the test map. Then archive with openspec-archive-change when asked.
- Reply to the user in PT-BR; code, docs, specs and commits in English.
- Another session (the HUD work) edits files in this tree at the same time
  (`scene-view.ts`, `editor.spec.ts`, `map-document.test.ts` changed on disk
  mid-session). Read a file right before editing it; never revert foreign
  changes.
- Mute the game sound before using the preview pane (`prestes.audio.v1`).
  Do not paint in the editor inside the shared preview pane (its autosave
  overwrites the user's map); verify editor work with Playwright.

### author-game-maps: 34/36 done

Done on 2026-11-10: 2.2 (sandboxMaps; catalog test), 3.2 (determinism on
the test map, golden `reason`), 3.4 (bench on the test map; the user chose a
4.5 ms test-map budget), 4.3 (light e2e; undo re-aims the sun), 5.1 (light
tests and screenshots shown), 5.2 (desk e2e with a routed empty index), and
section 8 (8.1-8.5): the compiler derives each side's three section starts
and facing from its deployment area (`sectionStartsFromArea` in
`packages/shared/src/maps/deployment-areas.ts`, `facingFromAreas` in
`document.ts`); stored section points are ignored; the editor shows only the
areas; map problems about starts select the side's area. The rule (middle of
the depth, 1/5-1/2-4/5, rounded, west to east) reproduces the test map's
old points, so its hashes did not change.

Open, recommended order (each has a Status/Apply note in tasks.md):
1. (done) **3.3 battle-report** on the test map; the gun bands hold only in
   battles of 600 s or more (user decision).
2. (done) **5.3 campaign book "Play the map"**. Its e2e fixture relabels
   `fazenda-doc`; switch it to `campo-de-provas` when 3.6 removes fazenda-doc.
3. (done 2026-11-10) **3.6 remove the old maps**: the four hand-written
   maps and fazenda-doc are gone; worker 195,910 B under 200,000 B; goldens
   `--reason "old maps removed"`; the 5.3 fixture relabels campo-de-provas.
   Follow-up (user): men stacked on one spot during bounds; fixed in
   bounding.ts (SLOT_ROOM between rush targets), battle-feel passes, goldens
   re-recorded. The column now loses the default 3v3 on the test map and
   presets A/C stand off (gun bands wait for objectives 4.1). Details in
   design.md Apply findings (3.6 follow-up). Seen: e2e cover-slots
   'hovering the trench ... a click fills them' fails (0 slotted, expects 3)
   with or without this fix. Cause: the trench it clicks (-45,-55) is the
   legalists' fire trench, its slots guard south (toward the column); the
   sim's move plans slots against the true nearest enemy (north), so it takes
   none, while the HUD preview (useOrders.ts, no threat) shows 3 planned.
   Fixed (user: "seen enemies only"): sim and preview plan slots against
   the nearest enemy the side sees (nearestKnownEnemyAt in geometry.ts and
   shared/preview.ts); cover-slots now clicks the stone 5022 and passes.
   Open point: defend/ambush still face the nearest enemy, seen or not (the
   AI's defend stalls battles otherwise); battle-report-weapons preset B
   now skips the gun checks (the gun never had a target). Details in
   design.md Apply findings (3.6 follow-up: seen enemies only).
4. **3.5 visual baselines**: visual.spec has failing baselines; re-record
   only in coordination with the HUD session
   (`local_ab470961-e164-4068-8fef-5d9a7672a40b`), or ask the user.
5. (closed 2026-11-10) **Section 7 bridges**: the user found the test map's
   bridge fine and closed the section without the rework.
6. **6.0 spec scenarios naming removed maps, 6.1 docs, 6.2 gates
   (`pnpm verify`, `pnpm e2e`, `openspec validate author-game-maps
   --strict`), 6.3 and 5.4 user hand checks** (mark only after the user
   confirms).

Known flake: `packages/simulation/test/deployment-orders.test.ts` "replay a
deployment" can fail in the full parallel vitest run and passes alone.

Other changes: machine-gun-fire-feedback 12/13 (only gates + the user's hand
check), polish-menu-desk 31/35 (Aseprite sprites, needs the user's
Aseprite window; task 6.6 done 2026-11-10: the open book redrawn in CSS, user approved; see its Apply note), retire-bootcamp complete (archive it when asked),
add-map-objectives 0/17 and video-tutorial-manual 0/19 (after
author-game-maps).

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
