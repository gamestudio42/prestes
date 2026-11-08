## Context

Battle maps today are TypeScript modules in `packages/shared/src/maps/`
(`fazenda.ts`, `serra-rio.ts`, `bairro.ts`, `vila-militar.ts`). Each exports a
`BattleMap` (`types.ts`): bounds, a height source (ellipse `features` or
authored `field` shapes summed on a 2 m grid), surface areas as polygons and
strips, water, bridges, ferries, vegetation polygons, buildings, covers,
sight obstacles, deployment zones, view-only props and fences, and a palette.
`setActiveMap` bakes a `MapRuntime` (`runtime.ts`): a `Float32Array`
heightfield at `HEIGHT_SPACING = 2` and 1 m `Uint8Array` grids of surface,
water and vegetation, cached by map id and baked the same way in the worker
and the main thread. `MAP_BOUNDS` and `PATH_GRID` are set from the active map;
the A* grid is 1 m. The three field maps are 400 × 400 m; the Vila Militar is
240 × 240 m. `validate.ts` holds the map checks; `tools/check-content.ts`
runs them. The view (`battle-map-layer.ts`) draws placeholders and the few
modelled kits with toon materials; the ground colour comes from the map's
palette. The game is one Vite page (`apps/game`) with a bundle budget per
chunk (`tools/bundle-budget.json`). The browser already stores settings in
`localStorage` (`storage.ts`).

This design answers the user's question "is it possible for a web game?":
yes. Everything the editor needs — a 3D view, a raster paint layer, a
heightfield, polylines, file export and import, local storage — runs in the
browser with the stack the game already uses. The only part that needs the
machine's filesystem, saving straight into the repository, runs through the
Vite dev server.

## Goals / Non-Goals

**Goals:** an editor page reusing the game's renderer and map runtime; a
document format that compiles deterministically to `BattleMap`; texture
paint, elevation, roads, water, structures, objects, vegetation and
deployment tools; three sizes up to 640 m; validation, undo, autosave,
export/import, dev save to project, playtest; authored maps in the catalog;
the existing maps and goldens untouched.

**Non-Goals:** a pixel tile painter; collaborative editing; a player map
workshop; mission scripting; destructible scenery; cliffs and overhangs;
converting the hand-written maps (beyond one proof map).

## Decisions

### Simulation/presentation boundary

The editor is presentation and authoring only; it never runs inside the
simulation. The boundary is the compiled `BattleMap`: the editor edits a
`MapDocument`, `compileMapDocument(doc)` (pure, in `shared`, no DOM) turns it
into a `BattleMap`, and both the worker and the view bake that map with the
existing `setActiveMap`. Playtest passes the document to the game page; the
game page compiles it, sends it to the worker in the `start` command (a
`map: { kind: 'document', doc }` variant next to the existing map id), and the
worker compiles it again itself. The simulation never imports editor code,
React, Three.js or the DOM; ESLint's boundary rules stay as they are.

### Deterministic kernel

Determinism comes from the document holding only integers and from a pure
compile:

- heights are `Int16` centimetres (−1,200 to 4,000) on the 2 m grid;
- paint and vegetation are `Uint8` 1 m grids (water is vector: rivers and
  ponds);
- vector objects store coordinates in metres rounded to the centimetre, so
  JSON parses them to the same doubles in every thread;
- the compile uses no RNG; the noise brush is seeded in the editor and its
  result is stored as heights, so playback never re-runs noise;
- road and ditch carving happens in the compile, in a fixed order (base
  heights → water channels → roads by id → ditches), with plain float math
  identical in both threads, then rounds back to centimetres.

`hashState()` goldens for the hand-written maps stay as they are; the proof
map gets its own golden in `tools/determinism-golden.json`.

### `MapDocument` format (content schema)

```ts
interface MapDocument {
  format: 'prestes-map'; version: 1;
  id: string;                       // kebab-case, file name
  size: 'small' | 'medium' | 'large';   // 240 | 400 | 640 m, centred
  name: { en: string; 'pt-BR': string };
  description: { en: string; 'pt-BR': string };
  use: 'skirmish' | 'campaign';
  setting: { label: 'training-ground' | 'historical-setting-fictional-place'
                  | 'reconstructed-historical-place'; sourceNote: string };
  codexKey?: string;
  palette: 'temperate' | 'cerrado' | 'caatinga' | 'urban';
  waterLevel: number;               // cm
  layers: {
    height: Raster<'i16'>;          // (size/2 + 1)² nodes
    paint: Raster<'u8'>;            // size² cells, material index
    vegetation: Raster<'u8'>;       // 0 none, else kind + 1
  };
  baseMaterial: GroundMaterialId;
  roads: Road[];                    // polyline, type, width, camber, ditches
  rivers: River[];                  // polyline, width, per-segment kind
  ponds: Pond[];                    // polygon, deep or ford
  bridges: Bridge[]; ferries: FerryCrossing[];
  lines: LineObject[];              // walls and fences: polyline, kind, height
  objects: PlacedObject[];          // catalog id, x, y, rotation, scale
  deployment: { column: DeploymentZone; legalist: DeploymentZone };
  objectives?: ObjectiveDef[];      // when add-map-objectives is present
}
type Raster<T> = { encoding: 'rle-base64'; type: T; data: string };
```

Rasters are run-length encoded then base64, so a flat 640 m map is a few
kilobytes and diffs stay reviewable at the vector level. A `migrate()` step
upgrades older versions; a newer version is refused. A JSON schema check
(hand-written guard, no new dependency) rejects malformed files.

The compile produces a `BattleMap` with two new variants:

- the `field` height gains an optional `grid` (the carved heights, whole
  centimetres, 2 m spacing) that the bake starts from before adding shapes,
  so every `kind === 'field'` path keeps working;
- `raster?: { surfaces, vegetation }` 1 m grids that `runtime.ts` copies
  instead of rasterising polygons; the road surfaces are stamped into it in
  the compile and the vector water over it in the bake, as today.

Buildings, covers, sight obstacles, props and fences are emitted from the
catalog entries exactly as the hand-written maps build them today
(`kit.ts` helpers: `trenchLine`, `rock`, barricades, `buildingCover`), so
a stone wall in the editor and in `fazenda.ts` give the same cover.

### Object catalog: every object counts

`packages/shared/src/maps/catalog-objects.ts` lists every placeable item with
its id, group (building, stone, tree, post, cover, prop, decal), footprint,
default height, its locale key and the gameplay pieces it emits. The user
asked (2026-11-08) that every object influence the battle, so the emitted
footprint is derived from one rule, not hand-tuned per map:

- **building**: a `Building` plus `buildingCover` (as today);
- **solid** (stones, carts, wells, haystacks, crates, barrels, trunks of
  broad trees): a `CoverPoint` with the kind from the entry (`stone`,
  `barrel`, `low-wall`), `blocksMovement`, quality by height (under 0.9 m
  0.3 prone cover, 0.9–1.2 m 0.4, over 1.2 m 0.55), and `blocksSight` when
  height ≥ 1.75 m and the narrow side ≥ 0.5 m;
- **thin** (posts, poles, narrow trunks, cacti stems): a `fence`-kind cover
  with quality 0, `blocksMovement`, no sight blocking;
- **foliage** (xique-xique and macambira clumps, bushes, a tree's canopy
  ring): stamps the `scrub` vegetation cells under its footprint, so the
  existing concealment rules apply;
- **decal** (pebbles, leaf patches): flat, stamps a ground material only.

Trees are trunk (solid or thin by trunk width) plus canopy (view only;
canopies do not block a sight line in this change, as on the hand-written
maps). Stones: small rock (0.6 m), boulder (1.2 m), matacão (2.2 m, blocks
sight), outcrop (1.8 m, long), lajedo slab (0.4 m, wide; also paints
`lajedo`), stone pile (0.9 m), pebbles (decal). Walls are `low-wall` covers
per straight piece (at most 12 m, like `fenceCovers`), sight-blocking from
1.75 m; fences are `fence` covers, the hedgerow also stamps `scrub`.

### Ground materials and the pixel-art look

Nineteen materials in `ground-materials.ts` (shared: id, surface, locale
key) — the twelve general ones plus cerrado red soil, cerrado grass,
cerrado litter, cracked caatinga soil, caatinga dry grass, lajedo and
pebbles — with tiles in `apps/game/public/textures/ground/` as one
32 × 32 px per material atlas (5 × 6: 19 detailed tiles and 10 basic near-flat colours appended after them, so saved paint codes keep their meaning; detailed palettes are pulled halfway to their mean colour so the pattern does not buzz at a distance), original, drawn by the author or generated by a
project tool and logged in `docs/assets.md`. A tile covers 2 × 2 m, so a
texel is 6.25 cm, in keeping with the pixel post.

The view builds the ground per 32 m chunk: the heightfield mesh plus a
`DataTexture` of material indices (1 texel per 1 m cell, `NearestFilter`).
The fragment shader samples the atlas at world-space UVs for the cell's
material and, within 0.5 m of a boundary, picks between the two materials
with a 4 × 4 Bayer threshold in world-space texel units — a pixel dither,
never a blend. It then goes through the toon ramp so it matches the kits.
Maps without a paint raster keep their current ground (palette colours), so
the hand-written maps' snapshots do not change.

Material → surface mapping (speed and cover from `terrain.ts`):
grass, dry grass, leaf litter → `grass`; packed earth, red earth, gravel →
`dirt-road`; mud → `mud`; sand → a new `sand` surface (speed 0.85, no cover);
stone, lajedo → `ridge`; cobbles → `cobbles`; quintal floor → `floor`;
field soil → `crop`; cerrado red soil, caatinga soil → `dirt-road`; cerrado
grass, caatinga dry grass, cerrado litter → `pasture`; pebbles → `sand`.
Adding `sand` is the one new `TerrainSurface`. The map palette gains
`caatinga` (pale, grey-green) for the toon ramp and sky.

### Editor architecture

- **Page**: `apps/game/editor.html` as a second Vite input, entry
  `src/editor/main.tsx`. Its own chunk (`editor-*.js`) with its own line in
  the bundle budget; `three` and `react` chunks are shared. The game's start
  screen gains no link in this change (the author opens `/editor.html`);
  a menu entry can follow.
- **State**: the open `MapDocument` in typed arrays plus vector lists, held
  by an editor store outside React; React renders panels only. Every edit is
  a command (`apply`/`revert`) on a history stack (200 steps); raster strokes
  store only the changed cells' old and new values, by chunk.
- **View**: a `SceneView` from `view3d` with an `EditorLayer` (brush cursor,
  grid, overlays for slope, contours and relief (height tint from the map's low to high ground, north-west hill shading, 1 m contours with a bold line every 5 m; terrain tools switch it on), gizmos for points and objects,
  deployment labels). Edits mark 32 m chunks dirty; only those chunks rebuild
  their ground mesh, paint texture and kit instances, so a stroke on a large
  map stays interactive (target: a 16 m stroke rebuild under 8 ms).
- **Tools**: paint, fill, erase; raise, lower, smooth, flatten, set, noise;
  road; river, pond; bridge, ferry; line (walls and fences); place; select
  (move, rotate, duplicate, delete, box select); vegetation; deployment;
  objectives. Each tool is a module with pointer handlers and a properties
  component.
- **2D mode**: the same scene with the camera straight down and an
  orthographic metre grid; no separate 2D renderer.
- **Persistence**: autosave to IndexedDB (key per map id, debounced 10 s);
  `localStorage` only for UI preferences (last tool, panel layout). Export
  downloads `<id>.map.json` via a Blob; import reads a chosen file.
- **Save to project**: a small Vite plugin (`apps/game/vite-map-save.ts`, beside the Vite config that loads it) adds
  `POST /__editor/save-map` to the dev server only (`apply: 'serve'`). It
  accepts a JSON body, checks the id is kebab-case, validates and compiles
  the document with the same shared code, and writes
  `packages/shared/src/maps/authored/<id>.map.json`. It never writes outside
  that folder. The editor shows the button when `import.meta.env.DEV`.
- **Playtest**: the editor stores the document in IndexedDB under
  `playtest` and opens `index.html?playtest=1`; the game page reads it and
  starts a 3 vs 3 with the default rosters; its end panel offers "back to
  editor".
- **Catalog of authored maps**: an explicit generated index
  (`authored/index.ts`, regenerated by `tools/check-maps.ts`) serves the
  view, Node tools and the worker alike, so the simulation stays free of Vite
  specifics. Skirmish maps are imported eagerly (the menu lists them); every
  map also has a dynamic-import loader, so campaign maps stay out of the game
  and worker bundles until `loadAuthoredMap(id)` fetches one. Hand-written
  maps keep their ids; authored ids must not collide.

### Map sizes and performance

`MAP_BOUNDS`, `PATH_GRID`, the camera's pan limits and the fog grids already
read the active map. Sizes become a table (240, 400, 640). The large size is
the risk: the 1 m path grid grows to 409,600 cells (2.56 × medium) and the
1 m rasters to 400 KB each. Decision: keep 1 m cells for all sizes and
measure first (task 1); if the large proof map misses 4 ms a tick, add a
coarse 8 m region graph for long A* queries and refine with the 1 m grid near
the ends. Vision cost scales with soldier pairs, not area, so it does not
change. The bake of a large map must stay under 300 ms in the worker.

Spike result (2026-11-08, `LARGE_TEST_MAP`, 1,500 ticks, default 3 vs 3):
large 2.29 ms a tick, bake 20 ms; Fazenda (medium) 2.52 ms, bake 16 ms. A
worst-case A* (a wall across the map, gap at the far end) floods in 122 ms on
large against 81 ms on medium; it runs once per order, not per tick. The
region graph is not needed; 1 m cells stay for every size.

### Low-poly pipeline

No new Blender kits are required: catalog items without a model are named
placeholders, as on the existing maps. Walls, fences and posts get simple
procedural placeholders (segmented boxes, posts and rails, a lamp post of
a cylinder and a box) in `battle-map-layer.ts`, instanced per kind. Finished
kits follow the existing `pnpm models` path later and are swapped by id.

### Localization

Editor strings live in the locale catalog under `editor.*` (tools, layers,
materials, catalog entries, properties, problems, dialogs) in EN and PT-BR;
`pnpm check:locales` covers them. A document's own name and description are
stored in both languages in the document, and validation requires both.

### Historical research method and figure roster

The editor adds no historical claim and no figure. A campaign map must carry
its setting label and a source note citing `docs/history/SOURCES.md`; a map
reconstructed from a period plan or photo uses
`reconstructed-historical-place` and names the source, and its compendium
entry follows the existing labelling (historical, dramatized, fictional).
Which historical figure commands on a map is decided by the mission
definition, not the map; the roster in `docs/history/FIGURES.md` is
unchanged. The author traces nothing from book scans under `livros/`.

## Risks / Trade-offs

- [Large maps blow the tick budget] → measure on the proof map at large
  size first; the region graph is the planned fallback.
- [Document drift from hand-written maps] → both compile through the same
  `kit.ts` helpers, and the proof Fazenda is checked against the battle
  report bands of the hand-written one.
- [Big JSON files in the repo] → RLE rasters; a flat-ish 640 m map is a few
  hundred KB at most; the check reports any map over 2 MB.
- [Editor scope creep] → tools ship in vertical slices (tasks), each usable
  on its own; the tile painter and mission scripting stay out.
- [Dev save endpoint misuse] → dev-server only, fixed folder, id pattern,
  validated body; never in the published build.
- [Dither shader cost on low-end GPUs] → one texture fetch per material plus
  one for the index; the chunked ground keeps draw calls at 400 for large.

## Migration Plan

Additive. Hand-written maps, their goldens and snapshots do not change. The
start command gains the document variant alongside the map id. Rollback is
removing the editor page and the authored folder; no saved data in the game
depends on them.

## Open Questions

- Should the editor get a link on the start screen now, or only after a few
  campaign maps exist? (Assumed: later.)
- The exact tile art for the twelve materials: the author's own pixel art,
  or a generated starting set they retouch? (Assumed: a generated original
  set as named placeholders, replaced as the author draws.)
