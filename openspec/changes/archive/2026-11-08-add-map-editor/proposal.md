## Why

The campaign needs many maps (the Forte de Copacabana, the São Paulo streets,
the Paraná and the sertão crossings), and today every battle map is
hand-written TypeScript in `packages/shared/src/maps/*.ts`: polygons, height
shapes and placement tables typed by coordinate. The user (2026-11-07) wants to
build the campaign maps themselves, visually, with a pixel-art texture brush,
terrain elevation, roads, buildings, walls, fences, posts and the rest of the
period clutter, in three map sizes. A browser editor that writes a data file
the simulation and the view both read makes that possible without touching
code for each map.

## What Changes

- **Map editor in the browser**: a separate page of the game build
  (`editor.html`, own bundle, not loaded by the game) that opens a 3D view of
  the map with the game's own renderer (orthographic, toon, pixel post), plus
  a top-down 2D mode for precise work. Tool palette, layer panel,
  properties panel, undo/redo, keyboard shortcuts. All strings PT-BR and EN.
- **Three map sizes**: small 240 × 240 m, medium 400 × 400 m, large
  640 × 640 m, chosen when a map is created; a map can be resized later by
  cropping or extending around its centre.
- **Pixel-art texture brush**: paints ground materials (grass, dry grass,
  packed earth, red earth, mud, sand, gravel, stone, cobbles, quintal floor,
  leaf litter, field soil, and for the biomes the column crossed: cerrado
  red soil, cerrado grass, cerrado litter, cracked caatinga soil, caatinga
  dry grass, lajedo and loose pebbles), plus basic near-flat colours for large areas and finishing, on a 1 m paint grid. Each material is an original
  32 × 32 pixel-art tile drawn with nearest filtering in world space, with
  dithered (not blurred) edges between materials. Every material carries its
  gameplay surface (speed, cover), so painting mud really slows men.
  Brush size, shape (round, square), strength (dither density) and a fill
  tool.
- **Elevation tools**: raise, lower, smooth, flatten (to a sampled height),
  set height, and a seeded noise brush, on the 2 m heightfield; height range
  −12 m to +40 m; a relief view (height colours, shading, contour lines every 1 m and 5 m), a contour overlay and a slope overlay.
- **Roads**: drawn as editable polylines with a type (trail, dirt road,
  cobbled street, paved road), width, optional drainage ditches on either
  side and a camber; a road flattens and cuts the terrain under it and paints
  its material. Crossings: bridges and fords placed where a road meets water.
- **Water**: rivers as polylines (width, deep or ford stretches), ponds and
  lakes as polygons, the map's water level.
- **Structures and objects** from a catalog: the existing building models
  (houses, sobrado, venda, armazém, church, chapel, barn, engenho, …),
  walls (taipa, dry stone, plastered brick) and fences (wire and post,
  board, picket, hedgerow) drawn as polylines, posts (street lamp, telegraph
  pole, flagpole, hitching post), trees and caatinga plants (mandacaru,
  xique-xique, juazeiro), several kinds of stone (small rock, boulder,
  matacão, outcrop, lajedo slab, stone pile, pebbles), crops and vegetation
  areas, covers (sandbags, trench lines, barricades) and props. Placement
  snaps to the grid or free, rotates, and follows the ground.
- **Every object counts in the battle** (user, 2026-11-08): each catalog
  entry declares its footprint — movement blocking, cover kind and quality,
  sight blocking, concealment — so stones, carts, trees, walls and posts
  all change line of sight and cover; nothing placed is decoration only,
  except flat ground decals.
- **Gameplay layers**: the deployment zones of both sides, the map bounds,
  and (when `add-map-objectives` has landed) the objectives.
- **Validation in the editor**: the existing map checks (deployment on dry
  reachable ground, props inside bounds, no overlapping buildings, bridges
  over water) plus a reachability check between the deployment zones and a
  cover-gap warning, shown as a problem list that jumps to the spot.
- **Save, export and campaign maps**: autosave to the browser's IndexedDB;
  export and import a versioned `*.map.json` document; in the dev server a
  "save to project" action writes the document to
  `packages/shared/src/maps/authored/`, where the catalog registers it as a
  battle map like the hand-written ones.
- **Playtest**: one button opens the skirmish with the edited map.
- **A `MapDocument` format and compiler**: the editor's document (raster
  layers plus vector objects) compiles deterministically to a `BattleMap`
  with a new grid heightfield and painted surface, water and vegetation
  grids. Hand-written maps keep working unchanged.

## Capabilities

### New Capabilities

- `map-editor`: the editor page, its tools (texture brush, elevation, roads,
  water, structures, objects, gameplay layers), undo/redo, validation,
  save/export/import, dev save to project, playtest, localization.

### Modified Capabilities

- `battle-maps` (arrives with `add-battle-maps`): authored maps from
  `MapDocument` files, the three map sizes, catalog registration of authored
  maps, deterministic compile.
- `terrain`: a grid heightfield and painted surface grid as terrain sources,
  with the existing speed and cover rules applied to them; per-material
  ground drawing in the view.

## Impact

- New: `packages/shared/src/maps/document.ts` (types, versioning, compiler),
  `packages/shared/src/maps/authored/` (map files), `apps/game/editor.html`
  and `apps/game/src/editor/` (React UI, tools, history), a Vite dev plugin
  for "save to project", ground material tiles under
  `apps/game/public/textures/ground/`, `tools/check-maps.ts`.
- Changed: `packages/shared/src/maps/types.ts` and `runtime.ts` (grid
  height and raster layers), `catalog.ts` (authored maps), `pathfinding.ts`
  and `MAP_BOUNDS` (sizes up to 640 m), `packages/view3d` (painted ground
  material, incremental chunk rebuild for the editor), skirmish map list,
  locales, asset register, bundle budget (editor chunk separate).
- **Player fantasy**: unchanged for the player; for the author, building
  the ground the historical figures fought on.
- **Core loop** (author): create map → shape terrain → paint ground →
  draw roads and water → place buildings, walls, fences, posts → set
  deployment → validate → playtest → save to project.
- **Historical scope**: the editor makes no historical claims itself. A map
  saved for the campaign must carry its setting label (training ground,
  historical setting with fictional place, or reconstructed historical place)
  and a source note citing `docs/history/SOURCES.md`; the editor refuses to
  save a campaign map without them.
- **Multi-perspective**: maps are perspective-neutral; which historical
  figure commands on a map is set by the mission, not the map. Deployment
  zones are named by side (column, legalist), not by figure.
- **Legal and ethical note**: all ground tiles and kits are original and
  logged in the asset register; no tiles, maps or layouts copied from other
  games or from book scans. Maps traced from period plans or photos keep
  the source in the note and are labelled as reconstructions; book scans
  under `livros/` are never loaded into the editor or committed.
- **MVP**: create/open/save/export/import; the three sizes; texture brush
  with 12 materials; elevation tools; roads with ditches; rivers, fords,
  ponds and bridges; buildings, walls, fences, posts, trees, vegetation,
  covers and props from the existing kits; deployment zones; validation;
  playtest; dev save to project; one authored map (a re-creation of the
  Fazenda as a document) proving the pipeline matches the hand-written map's
  behaviour.
- **Non-goals**: an in-editor pixel tile painter for new materials (tiles
  are made with the project's art tools for now); multiplayer or shared
  editing; a player-facing map workshop or upload service; scripted events
  and mission logic in the editor; destructible scenery; caves, overhangs and
  vertical cliffs; maps larger than 640 m; converting the existing
  hand-written maps (except the proof map).
