## 1. Size spike (risk first)

- [x] 1.1 Add the size table (small 240, medium 400, large 640 m) and a flat large test map in code; run a 3 vs 3 corner-to-corner path and the battle benchmark on it. Verify: `pnpm sim` bench reports mean tick on large; record the number in `design.md`. If over 4 ms, add task 1.2 (8 m region graph for long A* queries) before going on.

## 2. Map document and compiler

- [x] 2.1 `MapDocument` v1 types, RLE-base64 raster codec, guard and `migrate()` in `packages/shared/src/maps/document.ts`. Verify: Vitest round-trips rasters, refuses a newer version and a malformed file.
- [x] 2.2 `BattleMap` grid height variant (Int16 cm, 2 m) and raster layers (paint, water, vegetation); `runtime.ts` bakes them. Verify: unit test for bilinear sampling (1.00/3.00 m → 2.00 m) and terrain sight over a grid hill; existing map goldens unchanged (`pnpm check`).
- [x] 2.3 Ground material table (19 detailed materials, cerrado and caatinga included, plus 10 basic colours → surfaces) and the new `sand` surface. Verify: speed factor tests per material.
- [x] 2.4 `compileMapDocument`: base layers, rivers, roads with camber and ditches, lines (walls, fences) and objects through `kit.ts` helpers, deployment. Verify: deterministic compile test (two compiles, 1,000 ticks, same hash); ditch gives trench cover test.
- [x] 2.5 Object catalog (`catalog-objects.ts`): buildings, stones (7 kinds), trees and caatinga plants, posts, covers, props, decals, walls and fences, each with its gameplay footprint (solid, thin, foliage, decal). Verify: every catalog id has EN and PT-BR names (`pnpm check:locales`); tests "boulder hides", "small rock prone only", "post blocks only movement", "cart gives cover", "cactus conceals".
- [x] 2.6 Authored maps folder, generated index, catalog registration, `tools/check-maps.ts` in `pnpm check`. Verify: a broken test document fails the check naming the problem.

## 3. Painted ground in the view

- [x] 3.1 Placeholder ground atlas (29 original 32 × 32 tiles: 19 detailed at half contrast, 10 basic near-flat, named `placeholder-ground-*`), logged in `docs/assets.md`. Verify: asset register check.
- [x] 3.2 Chunked ground mesh (40 m) with material index texture, world-space nearest sampling and Bayer dither edges through the toon ramp; hand-written maps keep their ground. Verify: Playwright visual snapshot of a painted test map; Fazenda snapshot unchanged.
- [x] 3.3 Procedural placeholders for walls, fences and posts, instanced per kind. Verify: snapshot of a test map with each kind.

## 4. Editor shell

- [x] 4.1 `editor.html` second Vite input, editor store, history (200 steps), `SceneView` with `EditorLayer`, camera, 2D mode, status line, layer panel, locale keys. Verify: Playwright opens the editor; bundle check shows the editor chunk separate and the game chunks within budget.
- [x] 4.2 New map dialog (size, names EN/PT-BR, use, setting, palette) and resize with out-of-bounds list. Verify: e2e creates a medium map (bounds ±200 m) and shrinks a large one with a warning.
- [x] 4.3 Autosave to IndexedDB, export and import with error messages. Verify: e2e round trip compiles to the same map hash; invalid file leaves the map unchanged.

## 5. Tools (one usable slice each)

- [x] 5.1 Texture brush: paint, erase, fill; size, shape, strength; material tooltips with surface. Verify: e2e paints mud and reads the surface at the cell; undo restores it.
- [x] 5.2 Elevation: raise, lower, smooth, flatten, set, seeded noise; clamp −12/+40 m; slope, contour and relief views (height tint, shading, 1 m and 5 m contours; on with terrain tools), noise scale following the brush. Verify: unit tests for clamp and seeded noise; e2e raises a hill.
- [x] 5.3 Roads: draw, edit points, type, width, camber, ditches; incremental rebuild. Verify: e2e draws a dirt road with a ditch, moves a point, and the old line is restored.
- [x] 5.4 Water: rivers (deep/ford stretches), ponds, water level, bridges, ferries. Verify: validation reports no path with a deep river, finds one after a bridge.
- [x] 5.5 Structures and objects: catalog browser, place, snap (1 m, 0.5 m, free), rotate (15° or free), follow ground, select, box select, move, duplicate, delete; walls and fences as polylines. Verify: e2e places a house and draws a wall; headless test gives low-wall cover behind a 1.2 m wall.
- [x] 5.6 Vegetation brush (corn, cane, tall grass, scrub). Verify: concealment test on a painted cornfield.
- [x] 5.7 Deployment zones (and objectives when `add-map-objectives` is archived). Verify: e2e drags a section point; playtest starts the section there.

## 6. Validation, playtest, save to project

- [x] 6.1 Problem list in the editor (map checks, reachability, cover-gap warning, missing names/source note), click to jump. Verify: e2e selects a "deployment in water" problem and the camera centres on it.
- [x] 6.2 Playtest: document via IndexedDB to `index.html?playtest=1`, start command with the document variant, worker compiles it, "back to editor". Verify: e2e playtest starts the 3 vs 3 on the edited map and returns.
- [x] 6.3 Dev-only save to project (Vite plugin `apps/game/vite-map-save.ts`, fixed folder, id pattern, validation; refuses campaign maps without source note). Verify: plugin unit test writes only into `authored/`; e2e on dev server; published build hides the button.

## 7. Proof map and wrap-up

- [x] 7.1 Re-create the Fazenda in the editor as `fazenda-doc.map.json` (proof map; the menu keeps the hand-written Fazenda). Verify: battle report outcome within band, golden added to `tools/determinism-golden.json`, tick within budget; also at large size for the size budget.
- [x] 7.2 Docs: `docs/architecture.md` (document pipeline), `docs/assets.md` (tiles), `docs/status.md`; editor user notes in `docs/map-editor.md`. Verify: `pnpm check`, `pnpm e2e` and `openspec validate add-map-editor --type change --strict` pass.
