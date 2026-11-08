## Why

The user built maps with the editor on 2026-11-08 and liked the result, and
listed what breaks the illusion. Corn, cane and capim are still drawn as
little pines; bridges show the riverbank ground through their decks;
vegetation can be painted under water; river banks and painted borders look
jagged; trees are hard to find; a trench is a fixed 12 m object; and roads
reshape the relief when the author would rather shape it by hand. The user
also asked to see the cover the map offers while building it. These fixes
come before the deployment phase and the garrisons, which lean on trench
lines and cover.

## What Changes

- **Plants drawn as plants, on every map**: cornfields as rows of stalks
  with leaf cards and tassels, cane as dense segmented stalks with long
  leaves, capim as fans of 8–14 thin blades, scrub as low bushes; a thinner
  edge at the field border; gentle sway; instanced, within the frame budget.
  The look changes no concealment rule. This takes over the crops and grass
  look from `refine-battle-maps` (its tasks 5.8 and 5.12), so it applies to
  the hand-written and the authored maps alike.
- **Vegetation only where it can grow**: not in deep water or fords, on
  bridges, paved or cobbled roads, building footprints or trench channels.
  The brush skips those cells, compiling drops any left there, and the map
  check warns about them.
- **Bridges stand clear of the ground**: the deck reaches each bank at that
  bank's height with a short ramp, and no ground shows through the deck or
  its rails. It reads as planks.
- **Smoother edges, same pixel look**:
  - River centrelines are smoothed into curves, and water outlines follow a
    traced contour instead of stepping cell by cell.
  - Borders between painted ground materials are broken up with a fixed
    dither pattern, so long straight staircases go away while the ground
    texture stays pixel art.
  - Vegetation thins out at its edge.
  - Geometry edges are antialiased (MSAA) by default. A localized "Smooth
    edges" toggle in the options turns it off.
- **BREAKING (map documents): roads leave the relief alone**:
  - A road paints its surface and follows the ground as the author shaped
    it: no flattening, no sinking, no camber. The author shapes a road's bed
    with the relief tools.
  - Ditches are still dug channels that give cover, as trench lines are.
  - The document format goes to version 2. Version 1 files load, and their
    camber is dropped.
- **Trees tool**: a dedicated palette entry with a scatter brush (radius,
  density, a species mix per biome: Atlantic forest edge, cerrado, caatinga,
  pasture trees) and single placement. An eraser removes trees under the
  brush.
- **Tree models**: low-poly tree models adapted from the owner's Refloreste
  trees, cut to 300–800 triangles and logged in the asset register. Trees
  without a model keep their named placeholders.
- **BREAKING (map documents): trench lines drawn like roads and walls**: a
  polyline of any length (4 m and up). Each trench line has:
  - a kind: a fire trench with a parapet on a chosen side and a fire step,
    or a communication trench without a fire step;
  - a depth of 1.2 m, or 0.8 m for a shallow one;
  - optional firing bays (traverses every 8–10 m) and an earth or sandbag
    parapet.

  In battle, a trench line works like this:
  - It digs its channel and raises its parapet in the relief.
  - Men on the fire step have trench cover against threats on the parapet
    side, and take cover slots every 1.2 m along it.
  - A crouched man inside is hidden below the parapet.
  - Movement along the floor is at trench-floor speed.

  The fixed `trench-line` object leaves the catalog. Version 1 documents
  turn each one into a 12 m straight fire trench. The hand-written Fazenda's
  trench lines are built by the same rules, which replaces
  `refine-battle-maps` 5.3 (trench bays dug in).
- **Cover preview in the editor**: a "Cover" overlay that shows:
  - every cover slot as a dot, coloured by what it protects (a standing,
    crouched or prone man);
  - a count badge on each cover piece and trench line;
  - concealing vegetation, hatched;
  - the slot totals inside each deployment zone and along the attack axes.

  Hovering a piece shows its slots and the arc it covers.
- **Localization**: every new tool name, option, overlay, badge and
  warning ships in EN and PT-BR.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `map-editor`:
  - Roads no longer change the relief.
  - Trench lines are a line tool, and the catalog loses the trench object.
  - Vegetation is refused where it cannot grow.
  - New requirements: the trees tool and the cover preview.
- `battle-maps`:
  - Crops and grass look.
  - Trench lines in battle (channel, parapet, cover, slots, sight, speed,
    migration).
  - Bridges clear of the ground.
  - Smooth map edges, with the options toggle.
  - Map document version 2.

## Impact

- **Shared** (`packages/shared/src/maps/`):
  - document v2 (`trenches` list, road camber removed, migration);
  - compile: roads stop editing heights; trench carving, parapets, covers
    and slots; vegetation masks; bridge abutments;
  - the trench builder that the hand-written Fazenda also uses.
- **View** (`packages/view3d`): plant geometry and instancing, bridge decks,
  smoothed water outlines, dithered material borders in `PaintedGround`,
  trench channel drawing, MSAA setting in `SceneView`.
- **Editor**: trench tool, trees tool, the cover overlay, road properties
  without camber, the vegetation brush mask.
- **Game**: an options toggle, kept in local storage.
- **Goldens**: Fazenda (trench lines through the shared builder) and
  `fazenda-doc` (v2 roads and trenches) are re-recorded with the reason.
  Visual baselines are re-recorded (MSAA, plants).
- **Assets**: tree models and plant textures in the asset register.
- **Other changes**:
  - `refine-battle-maps` loses 5.3, 5.8 and 5.12 and its "Crops and grass
    look" requirement.
  - `garrison-and-assault` takes trench lines from this change.
- **Non-goals**: no new building models; no erosion or terrain generators;
  no trench lines dug during battle.
