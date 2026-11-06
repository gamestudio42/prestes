## Context

Terrain today is a module-level list of ellipse features in
`packages/shared/src/terrain.ts` (`setActiveTerrain`), with height,
surface, slope, speed and cover as pure functions of position. Covers,
sight obstacles and buildings are tables in `world.ts` and
`training-ground.ts`; the engine picks them by scenario
(`bootcamp | battle3v3`) and the view picks its countryside by a `WorldMap`
string. `MAP_BOUNDS` is fixed at ±120 m and the A* grid in
`pathfinding.ts` at ±100 m with 1 m cells. Sight lines (`isLineBlocked`)
check covers and sight obstacles with stance eye heights
(`EYE_HEIGHTS`), but not the ground. The fog-of-war change (implemented,
not yet archived) adds per-side vision in `systems/vision.ts` and the
`FogView` filter in `shared`; its design left "terrain blocking sight" and
"concealment" to this change.

## Goals / Non-Goals

**Goals:** one map definition read by simulation and view; heightfield
terrain that blocks sight and fire; water with three kinds of crossing;
vegetation concealment inside fog of war; three playable maps; map choice
for the 3v3; the default map and its golden untouched; 3v3 tick under 3 ms
on the largest map.

**Non-Goals:** streaming or tiling terrain; a terrain editor; per-blade
grass or per-stalk crop simulation; bullets stopped by vegetation; boats
other than the ferry; changing the bootcamp map.

## Decisions

### A `BattleMap` definition in `shared`

`packages/shared/src/maps/` holds one module per map plus `catalog.ts`,
following the precedent of `training-ground.ts` (data the simulation and
view both import; `content` holds only locales and codex text for maps).

```ts
interface BattleMap {
  id: 'vila-militar' | 'fazenda' | 'serra-rio' | 'bairro';
  nameKey: string; descriptionKey: string; codexKey: string;
  setting: { label: 'historical-setting-fictional-place'; sourceNote: string };
  bounds: { minX; minY; maxX; maxY };
  height: { kind: 'features'; features: TerrainFeature[] }
        | { kind: 'field'; spacing: 2; shapes: HeightShape[] };
  surfaces: SurfaceArea[];          // polygons, later entries win
  water: WaterArea[];               // deep or ford polygons
  crossings: Crossing[];            // bridge deck, ferry landings
  vegetation: VegetationArea[];     // corn | cane | tall-grass | scrub polygons
  buildings: Building[]; covers: CoverPoint[]; sightObstacles: SightObstacle[];
  deployment: { column: DeploymentZone; legalist: DeploymentZone };
  props: PropPlacement[];           // view only: trees, fences, lamps, rails
}
```

`setActiveTerrain` becomes `setActiveMap(map)`, which bakes the map once
(heightfield, surface grid, vegetation grid, walkable grid) into a
`MapRuntime` that every query reads. The engine takes `map?: MapId`
(default `vila-militar`); the client passes the same id to the view.
The Vila Militar field is wrapped as a `BattleMap` with `kind: 'features'`
and its current tables, so its queries and golden do not change.

Rejected: map data in `content`. The simulation would have to import
content for core geometry, and the precedent is `shared`.

### Heightfield from authored shapes

Each `field` map lists shapes: `hill` (centre, radii, height, falloff),
`ridge` (polyline, width, height), `channel` (polyline, width, depth, for
the river and sunken roads), `embankment` (polyline, width, height) and
`cut` (rectangle, depth, for trench bays and the communication trench). The
bake sums them on a 2 m grid in a fixed order with plain float math and
stores a `Float32Array`; sampling is bilinear. Same code in both threads, no
RNG, so the bake is deterministic. 400 × 400 m at 2 m is 40,401 samples.

Rejected: a PNG heightmap. Hand painting is hard to review in diffs, hard
to keep in sync with trench and river placement, and decoding needs the DOM
in the worker.

### Terrain in the sight line

`isLineBlocked` gains a terrain step: along the eye-to-eye segment, sample
the heightfield every 2 m (the grid spacing) and block when ground is above
the line. Ellipse maps keep their current ridge cover rule; on field maps
the ridge-between rule becomes the same terrain-in-line check, so cover by
a crest and sight by a crest agree. The sampling count is capped by range:
120 m gives at most 60 samples. Vision's 20 m grid and first-observer exit
(fog-of-war) keep the count of such lines low.

### Water, bridge and ferry

Deep water marks its cells unwalkable in the walkable grid, so A* routes to
the crossings without any special case. A ford is a walkable surface with
speed 0.5 and a "no prone" flag the stance command reads. A bridge is a
walkable deck polygon cut out of the water, with `cover: 0` rails as props.
The ferry is the only moving piece: a simulation entity
`{ id, landingA, landingB, position, state, load: unitIds[] }` driven by a
tiny state machine (`waiting`, `boarding`, `crossing`, `unloading`), 20 s a
crossing, capacity 6. A move order whose path crosses the river and whose
best path uses the ferry splits into "walk to landing, board, ride, walk
on". It is part of `hashState()`. The view draws it from the frame.

Rejected: making the ferry a walkable moving platform. It would need
moving obstacles in A*, which the grid does not support.

### Concealment in the vision pass

Vegetation is rasterized at bake time into a 1 m grid of kind ids (with an
"edge depth" per cell, the distance to the field edge). In fog-of-war
vision, after range, cone and line checks, an observer sees a target in
vegetation only if their distance is under the concealment distance for the
target's stance and kind (doubled when the target runs; ignored for 4 s
after he fires, tracked as `revealedUntil` per unit). Crops add one more
step to the line check: walk the segment through the vegetation grid and
sum the length that is in corn or cane while the line's height there is
below the crop height; block over 6 m. This uses the same segment walk as
the terrain step. Combat's own `visible()` uses the same function, so a
soldier fires only at what he could see. Hit chance does not read
vegetation.

### Pathfinding grid per map

The grid takes size and origin from the map bounds. At 1 m cells, 400 m is
160,801 cells, four times the current grid. The `MinHeap` A* stays; the
walkable grid is baked once per map, and paths are cached per section move
as now. If the headless bench shows paths over 4 ms on Fazenda, the grid
moves to 2 m cells with a 1 m final approach, which is already how open
targets are snapped. The decision is taken by the bench, not up front.

### View: ground, water, fields

- Ground: one mesh per map from the heightfield (2 m), vertex colours by
  surface, flat shading, in the existing pixel post.
- Water: a flat translucent plane per water area at its level, a darker
  band for the ford.
- Crops and grass: instanced low-poly clumps on a jittered grid seeded by
  map id (view-only RNG, never in the simulation), one `InstancedMesh` per
  kind. A soldier inside crop is drawn as now; the crop's height hides him
  from a low camera. Concealed own soldiers get a small leaf marker and the
  tooltip label.
- Kits (Blender, exported by `pnpm models`, added to the asset register):
  Fazenda — casa-sede, colonist house, engenho with chimney, corral, coffee
  row, corn clump, cane clump, wire fence, trench bay, sandbag; Serra e Rio
  — wooden bridge, ferry and landings, buriti palm, cerrado tree, rock
  outcrop, tall-grass clump; Bairro — terraced house (two widths, one and two
  storeys), factory with chimney, church, tram rails, gas lamp, barricade,
  embankment. Missing models fall back to named grey placeholders
  (`placeholder:engenho`, ...) through `warnMissing`.

### Map choice in the app

`StartScreen` gets a map list under the 3 vs 3 entry and `SandboxPanel` a
select; both pass `map` to `createClient`. Names, descriptions, tooltip
labels and the concealed label go through the locale catalog (PT-BR and
EN). Each map gets a codex entry with its setting and source note.

### Simulation/presentation boundary and determinism

Maps are static data; the bake is pure. Only the ferry and `revealedUntil`
are new simulation state, both hashed. The view's clump jitter uses its own
seeded RNG and never feeds back. Each new map gets a 1,000-tick 3v3 golden;
the Vila Militar golden must stay byte-identical.

### Historical research method

Each map is a fictional place in a sourced setting. Before a map's codex
note is written, its setting claims are checked against `macaulay-1974`
(Tier 0: chapters I and III–IV for São Paulo and Paraná, Foreword and
chapter IV for river crossings) and, for the interior and civilian detail,
`blanc-2024` (Tier 1). Material culture (engenho, colonist houses, buriti
veredas, terraced houses, trams) is period detail labelled as historical
note; any doubt goes to `docs/history/TIMELINE.md` as a conflict, not into
the map. No layout is traced from a scan or a period plan. No historical
figure commands on these maps: they are skirmish fields; the figure roster
is unchanged.

## Risks / Trade-offs

- [Terrain and crop line checks raise vision cost] → shared segment walk,
  2 m steps, existing vision grid; bench on Fazenda with all 66 soldiers.
- [A 400 m map makes battles long] → deployment stays 180 m apart, not at
  the map edges; the extra space is for flanks. The battle report's feel
  bands decide.
- [Crops make the enemy blind and the battle stall] → the quiet-field rule
  still sends the enemy looking; the commander treats a field next to a
  "?" marker as a known contact area.
- [Ferry adds a special case to orders] → kept to one state machine and
  one order split; the bridge and the ford need no special case.
- [Urban map evokes real civilian suffering] → no civilians, a codex note,
  no rewards for destruction.
- [Many new models for a solo developer] → named placeholders first; each
  map is playable before its kit is finished.

## Migration Plan

The default map wraps today's data, so existing tests and goldens hold.
`setActiveTerrain` callers move to `setActiveMap`. Rollback is removing the
three maps from the catalog.

## Apply findings

- **The engine's `map` option was taken.** It already picks the training
  ground or kit, so the battle map is `battleMap` (an id, or a map object in
  tests).
- **River crossings.** A* flooded a whole bank looking for a crossing (8 ms a
  path). Paths over deep water now go by each crossing's two ends (bridge
  ends, a ford's `ends`, ferry landings at a 60 m penalty) and take the
  shortest: 0.08 ms. Bound rushes steer for the next corner of that path, or
  an advancing section stalled on the bank.
- **Nobody in the river.** Slots and separation could push a man into deep
  water; he now steps back to the nearest bank each tick, and open points
  and order targets avoid deep water.
- **Bairro redrawn (user, 2026-11-05).** The first grid of long terraces read
  as a European quarter. It is now a Brazilian plan: a cobbled main street of
  vendas, an armazém and sobrados through a praça with its matriz and a
  coreto; small one-storey houses on 8 m lots, each with a side passage and a
  long quintal closed by brick walls or fences.
- **Nothing is climbed.** Fences, coffee rows and the rocks drawn as props
  are now movement-blocking covers (`fence` kind: no cover, no slots).
- **Hundreds of covers.** Bairro has about 430. A uniform cover index (8 m
  cells, battle maps only, a pure filter so results do not change) serves
  sight, cover and movement queries; the frame copy and hash digest of the
  covers are cached; rush cover candidates are ranked by straight distance
  and their paths capped. Fazenda 1.9 ms, Serra e Rio 1.8 ms, Bairro 3.9 ms a
  tick.
- **Feel bands not met on two maps.** The scripted report ends Fazenda in
  4-5 minutes. On Serra e Rio and Bairro the fight is decided but not ended
  within 15 minutes: the last few enemies hide and nobody hunts them, the
  follow-up fog-of-war already logged. Task 9.1 stays open on that.
