## Context

See proposal.md. Observed:

- `packages/shared/src/maps/catalog-objects.ts`: seventeen buildings
  (farmhouse, barn, chapel, casa-sede, colonist-house, engenho,
  ferry-house, terraced-house, terraced-house-wide, sobrado, factory,
  church, warehouse, casa-terrea, venda, armazem, coreto) and six stones
  (rock-small, boulder, matacao, outcrop, lajedo-slab, stone-pile), all
  `cover: 'stone'`.
- `packages/view3d/src/battle-map-layer.ts`: `MODELLED = farmhouse, barn,
  chapel`; the rest are drawn by code from a wall and roof colour table,
  with a special case for the coreto and the sobrado's upper floor; stones
  are drawn by code per id.
- `art-src/blender/target_buildings.py` builds barracks, farmhouse, barn,
  chapel and an aid tent with a `MeshBuilder`.
- `packages/shared/src/maps/openings.ts` places doors and windows by rule
  (`WINDOW_SPACING`, `BUILDING_WALL_SHARE`), defines upper floors per model
  (`BUILDING_UPPER`) and towers; `positions.ts` turns them into garrison
  positions. The battle's openings are therefore data the art can read.
- Line kinds include `stone-wall`; seven kinds in all (`LINE_KINDS`: each
  is a wall or a fence, with a default height and a half depth; the
  hedgerow also conceals). Props are eight, in the `prop` group; the art
  kit's `aid-tent` (target_buildings.py) is not in the catalog.
- `docs/history/FORCES.md`: the Column crossed the Paraná with 600 horses
  and mules and three 75 mm guns, later abandoned in Mato Grosso.

Boundary: the simulation keeps reading footprints and openings from shared
data; models are view-only. The pipeline stays script-built.

## Goals / Non-Goals

**Goals:**

- One source for openings, read by both the battle and the art build.
- Adding a building is a builder function and a catalog row.
- Old maps unchanged; goldens unchanged for the present buildings.

**Non-Goals:**

- Changing where the present buildings' doors and windows are (that would
  move goldens); the models are fitted to the data, not the reverse.

## Decisions

**D1. The art build reads the battle's openings.** The shared opening rules
are exported to JSON by a small tool (`tools/export-openings.ts`), and
`target_buildings.py` cuts doors and windows from it. A hand-kept copy of
the openings in the Blender script was considered and rejected: the two
would drift, which is the defect the spec's check exists to catch. The
check itself (task 2.3) compares the exported model's opening markers
(empties named per opening) with the shared data.

**D2. Builders, not hand models.** Each building is a Python function over
`MeshBuilder` (walls from the footprint, a roof form from a small library:
gable, hip, lean-to, half-hip, zinc shed, thatch), plus features. This
matches how the three modelled buildings are made and keeps `pnpm art`
reproducible.

**D3. Variants are a material and a few toggles.** A variant swaps atlas
regions (whitewash, ochre, bare adobe, brick; tile, thatch, zinc) and may
drop plaster patches; geometry and openings are the same. The map document
stores `variant` per building in a new version; it is not hashed.

**D4. Rock kinds are a second axis on stones.** A stone entry is a size
(the present ids) and a kind. The kind picks the builder (rounded boulders,
bedded ledges, blocky plateau rock, cobble scatters, flat lajedo) and the
palette. The present ids keep their meaning with the default kind, so maps
load unchanged. Cover stays a function of size (`solidQuality`,
`solidBlocksSight`).

**D5. Built stone reuses line kinds.** The dry stone wall is the existing
`stone-wall` line with a rock kind; the corral, steps and retaining wall
are objects. Following the ground uses the line drawing the other walls
already have.

**D6. The owner picks the new buildings.** Task 1.1 puts the candidate list
(with a one-line source or "generic period type" each) to the owner; only
the approved ones get builders. The proposal's list is a candidate.

**D7. Drawing code leaves `battle-map-layer.ts`.** As the coded boxes and
stones go, what is left of building and stone placement moves to a
`structures-layer.ts`, in line with splitting large files when touched.

**D9. Objects by size, as stones are.** A new object's battle part is a
footprint and a cover class picked by its size and stuff, from the classes
the catalog has (barrel, low wall, stone, sandbag): a canoe on the bank or
a cart is low cover like a barrel, a tractor or a landing stage's piles
block like stone. An object placed in water keeps its footprint, but water
already stops movement, so in water it is drawing only and gives no cover;
the editor allows the waterside group on water cells and shallow banks.
New groups `water` and `camp` sort the editor's list; `farm` and `town`
objects stay in `prop`, with a sub-heading.

**D10. New fences and walls are appended line kinds.** Each is a
`LINE_KINDS` row (wall or fence, height, half depth, conceals), drawn by the
line drawing the walls already use, so it follows the ground. Appending
keeps every saved map's line kinds where they are. A wall gives the cover
of a wall of its height, a fence what the present fences give.

**D11. The camp is the Column's and the government's.** Camp objects have
one model each and, where the sources show a difference (canvas against
improvised shelter, issue boxes against requisitioned barrels), a variant
per side through D3; they carry no faction rule in battle.

**D8. Level of detail.** Buildings are instanced per model and variant; at
the strategic band the same model is drawn without its small features
(a second mesh in the kit), so a town stays in budget.

## Risks / Trade-offs

- [Rule-placed windows look mechanical on a modelled facade] → the rule's
  spacing is kept for the present buildings (goldens), but a new building
  may declare explicit openings in the shared data, which the art then
  reads; the check covers both.
- [`buildings.glb` grows several times] → split by group (rural, town,
  military) and loaded by what the map uses, as proposed for trees.
- [Remodelling changes how maps the owner already drew look] → a
  before/after review sheet per building, approved by the owner before the
  old drawing is removed.

## Open Questions

- Which variants each building gets, decided on the review sheet.
- Which waterside, farm, town and camp objects and which fences and walls
  are made, decided by the owner in task 1.1 from the proposal's
  candidates.
