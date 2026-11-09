## Context

See proposal.md for the motivation (the user's editor test of 2026-11-08).
The current state, as found in the code:

- **Plants**: `packages/view3d/src/battle-map-layer.ts` draws corn, cane and
  tall grass with the same four-sided `unitCone` (the "pines") and scrub
  with a rock shape. These are instanced on a jittered grid over polygons or
  the authored vegetation raster.
- **Vegetation placement**: nothing masks the raster, so vegetation painted
  on a river stays there in the compiled map.
- **Bridges**: the bridge deck sits at `waterLevel + deckHeight` whatever
  the banks' height. On authored maps the banks are often higher than that,
  so the ground mesh passes through the deck. The pale ground patches the
  user saw on the planks are this.
- **Jagged edges**: `SceneView` renders with `antialias: false` and pixel
  ratio 1. The painted ground uses 1 m cells, and the water and bank
  surfaces follow 1 m cells and the river's straight segments, so diagonal
  banks show a regular staircase.
- **Roads**: `compileMapDocument` flattens the ground across each road,
  sinks it by its type, cambers it and digs its ditches.
- **Trenches**: a catalog object (`trench-line`, 12 m) compiled by
  `rotatedTrenchLine` into trench covers. The hand-written Fazenda has its
  own trench covers.
- **Cover slots**: computed in shared code (`allCoverSlots`,
  `cachedCoverSlots`), so the editor can show exactly what the game uses.

## Goals / Non-Goals

**Goals:** one plant look for every map; one trench builder for authored
and hand-written maps; editor-visible cover that matches the game; no
simulation change from purely visual work (plants, dither, MSAA).

**Non-Goals:**
- per-plant collision;
- trench lines dug during battle;
- water simulation;
- converting the hand-written maps into documents (they keep their data and
  only call the shared trench builder).

## Decisions

### D1. Plants are small code-built meshes, instanced, with a vertex sway

- **Corn**: a thin stalk, four leaf quads angled down and a tassel.
- **Cane**: three stalk segments and two long leaves.
- **Capim**: a fan of 10 blade triangles of varied length.
- **Scrub**: a low lumpy bush.

All use the toon material with instance colours, and sway in the vertex
stage with a phase hashed from the instance id. Corn rows follow each
field's main axis, the principal axis of its connected cells, or its polygon
for hand-written maps. Density thins in the last metre of a field.

At strategic span, instances are capped. Each kind keeps a coarse clump
mesh standing for 4 plants, so the mass still reads.

Alternative: alpha-tested billboard cards with a plant atlas. Rejected for
now: alpha testing fights the toon outline and MSAA, and code-built meshes
need no new texture pipeline.

### D2. One vegetation mask, shared by the brush and the compiler

`growableCell(map, x, y)` is false in these places: deep water and fords
(after river smoothing), bridge decks, paved and cobbled road surfaces,
building footprints and trench floors.

- The brush skips those cells.
- The compiler zeroes them.
- The map check counts the zeroed cells and warns.

Hand-written maps: their vegetation polygons are clipped by the same mask
when the view places plants. Their concealment polygons already avoid water,
so their goldens do not change.

### D3. Bridges rest on their abutments

- The deck's end heights come from the ground at each landing. In the
  middle, the deck is the higher of the water clearance and the line between
  the two ends.
- On authored maps the compiler lowers the ground under the deck span, so it
  stays at least 0.4 m below the deck except at the two ramps.
- The view draws the deck from the same function.

The simulation's walkable deck uses the same heights. A hand-written map
whose banks were already below the deck keeps its geometry, and its golden
is expected to hold. If one changes, it is re-recorded with the reason.

### D4. Smoothing is content-level first, MSAA second

- **Rivers**: centrelines are subdivided with Catmull-Rom at 2 m during
  compilation, so the simulation and the view share the smoothed water.
  Water outlines are traced with marching squares on a 0.5 m water mask and
  simplified.
- **Painted borders**: the ground shader offsets the cell lookup by a 4×4
  Bayer pattern within half a cell, only where neighbouring cells differ.
  This breaks the staircase but keeps hard pixels, and it is view-only.
- **MSAA**: `antialias: true` when the "Smooth edges" option is on (key
  `prestes.graphics.v1`, default on). It applies when the battle view is
  created, so a change applies on the next battle or reload, and the option
  says so.

MSAA smooths polygon silhouettes (water edges, bridges, plants, walls) and
not texture texels, so the pixel ground stays crisp.

Alternatives rejected: FXAA, which blurs the pixel texture; supersampling,
which costs too much on modest machines.

### D5. Roads paint, ditches dig

- The compiler stops writing heights for roads.
- A ditch still digs a 0.8 m × 1.5 m channel below the ground beside the
  road. A ditch is a dug feature with gameplay cover, like a trench line, so
  it is the one exception.
- `camber` is removed from the document (version 2) and from the road
  properties.

Decision recorded from the user's message: "as estradas não precisam alterar
o relevo, podemos alterar isso manualmente na ferramenta de relevo". If the
author also wants ditches without a channel, a later option can turn the dig
off; the cover rule stays.

### D6. Trench lines: one builder

The data is
`{ id, kind: 'fire' | 'communication', depth: 1.2 | 0.8, facing: 'left' | 'right', bays: boolean, parapet: 'earth' | 'sandbag', points }`.

`buildTrenchLine(line, heightField)` returns:

- **Height cuts**: the floor at its depth over 1.5 m, 0.3 m sloped walls
  and a fire step 0.3 m above the floor on the parapet side.
- **A parapet**: an earth berm 0.4 m high and 1.2 m wide, or a sandbag row
  (sandbag cover).
- **Covers**: 3 m trench pieces with a forward normal. Cover and stance
  hiding apply only to threats in the forward half-plane. A communication
  trench uses two-sided pieces with no slots.
- **Slots**: every 1.2 m on the fire step, facing forward.
- **Bays**: an earth traverse across the forward half of the floor every
  10 m, so the floor stays continuous at the back.
- **View strips**: the revetment and the duckboard look.

The Fazenda's hand-written trenches become `TrenchLineDef` data run through
the same builder. This replaces `refine-battle-maps` 5.3, and the Fazenda
golden is re-recorded.

`garrison-and-assault` reads trench lines as positions: capacity is one man
per 1.2 m of fire step, ports are the slots.

Applied (2.1–2.3):

- **Shallow simulation cut** (decided with the owner): with the full 1.2 m
  cut, a crouched man's eye sits 0.2 m below the ground and the 0.4 m
  parapet hides everything, which a fire step 0.3 m up does not cure. The
  heightfield therefore sinks 0.5 m for a 1.2 m trench and 0.3 m for a
  0.8 m one (`TRENCH.simDepth`), so a crouched man on the fire step sees over
  the parapet and a prone man does not. The view (2.4) dresses that cut:
  dark floor, duckboards, revetted walls up to the lip, the parapet and the
  traverses, so a man on the floor is drawn below the ground where the
  simulation has him. Cover, slots and stance rules are unchanged.
- The cut is 2.4 m wide in the heightfield (the 2 m grid would miss a 1.5 m
  one); floor surface, cover and slots keep 1.5 m.
- Cover pieces are whole numbers of 1.2 m slots (about 3.6 m, not 3 m), so
  a line's slot count is one per 1.2 m exactly.
- Traverses are view data; slots are not removed near them.

### D7. Trees tool: seeded Poisson-disc scatter

- A stroke scatters trees by Poisson disc, at least 2 m apart and 2 m from
  footprints, never on water or roads.
- The species are drawn from the chosen biome's mix table.
- The random seed is `(map id, stroke number)`.
- The trees are ordinary `DocObject`s; one stroke is one undo step.
- The eraser removes tree objects under the brush.
- The tool's species list is the catalog's tree group, with thumbnails.

### D8. Tree models from the owner's Refloreste trees

- The trees come from the owner's own project.
- They are decimated in Blender to 300–800 triangles, given the toon
  material and exported by `pnpm models` like the other models.
- The asset register records the source project and the licence the owner
  gives.
- A species without a model keeps its named placeholder.

Applied (5.2): the owner confirmed Refloreste is their own work. Its crowns
are leaf cards that a Godot shader expands into billboards, so a straight
decimation leaves specks. The trunks come from a low LOD, and each crown is
rebuilt from its cards as k-means clumps in the species' leaf colour; palm
fronds are real geometry and stay. The models are vertex-coloured, so they
load with their own toon material.

### D9. Cover preview reuses the game's slots

- The overlay compiles the open map (already done for the view) and calls
  the shared `allCoverSlots` on its covers.
- Each slot is classed by the stances its cover protects (standing,
  crouched, prone, from the cover height rules).
- Slots are drawn as instanced dots.
- Badges are DOM labels per piece; at strategic span they are clustered per
  50 m cell.
- Zone totals count slots inside each side's deployment area (today the
  points' 40 m circles, or the zone polygons once `add-deployment-phase`
  lands).

### D10. Document version 2

- `migrate()` turns version 1 into version 2:
  - each `trench-line` object becomes a 12 m straight fire trench with the
    object's centre, rotation and facing;
  - road cambers are dropped.
- Writers always write version 2.
- `fazenda-doc` is rebuilt by `pnpm map:fazenda-doc` with real trench
  lines.

## Risks / Trade-offs

- [Plant instance counts on large maps (over 100k)] → caps per kind and
  clump meshes at strategic span; frame budget test at strategic zoom on the
  heaviest map.
- [MSAA cost on weak GPUs] → an option to turn it off; the performance e2e
  runs with it on.
- [River smoothing moves water by a few decimetres on authored maps] →
  only authored goldens (`fazenda-doc`) change; validation runs after
  smoothing.
- [The Fazenda's trench geometry changes battle results] → re-record its
  golden with the reason; the battle report bands must still pass.
- [Licence of the Refloreste trees] → ask the owner before committing the
  models; placeholders until then. Resolved: the owner's own work.
