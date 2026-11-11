## Why

Of the seventeen buildings in the editor, three (farmhouse, barn, chapel)
are modelled in the art kit; the other fourteen are boxes with a wall and a
roof colour drawn in code, with windows and doors placed by a rule. Stones
are six shapes of one grey rock. The owner asked (2026-11-11) to revise how
the buildings look and to add more buildings and more kinds of stone.

## What Changes

- **Every building is modelled in the art kit**, in the Prestes low-poly
  and pixel-texture style, with the features that tell it apart at the
  tactical band: roof form (two or four waters, tiles, thatch, zinc),
  eaves, verandas, towers, chimneys, door and window frames, plinths and
  wear. The fourteen box buildings are replaced; the three modelled ones
  are brought up to the same level.
- **The model agrees with the battle.** A building's doors, windows, upper
  floor and tower are drawn where the battle uses them: a window the
  garrison can fire from is a window in the model, and the model has no
  opening the battle does not know.
- **More buildings**, chosen by the owner from a candidate list in task
  1.1: rural (a wattle-and-daub house, a thatched ranch, a corral with a
  stone wall, a flour house, a wayside cross and cemetery wall), town (a
  railway station, a telegraph office, a town hall, a jail, a school, a
  market shed, a water tank) and military (a barracks block, a guardhouse,
  a depot). Each is a full catalog object: footprint, height, openings,
  garrison capacity, cover.
- **Building variants.** A building can be placed in a few looks (wall
  colour, roof material, state of repair) without being a different object
  in battle.
- **Kinds of stone.** Stones get rock kinds with their own shape and
  colour, tied to where they are found: granite boulders, sandstone ledges
  and slabs, quartzite and canga of the plateaus, river cobbles and the
  lajedo of the caatinga, each in several sizes; and built stone (a dry
  stone wall, a stone corral, stone steps and a retaining wall) in the same
  rock kinds. A stone's cover and whether it blocks sight still come from
  its size.
- All names in PT-BR and EN.

Design intent. Player fantasy: fighting for real places (a station, a
chapel, a farm's stone corral), not for boxes. Pillar: terrain you can
read, and history you can play. Loop beat: authoring a map; choosing which
position to take and hold in battle. Hypothesis: a player tells at a glance
which building can be garrisoned upstairs and from which side it can be
fired on, because the model shows it.

MVP: the seventeen present buildings remodelled with openings that agree
with the battle, at least eight new buildings, five rock kinds in three
sizes, built stone in two kinds. Non-goals: destructible or burning
buildings, interiors, furniture, new garrison mechanics, bridges and
fortifications (their own kits), and a town generator.

Historical and legal note. Buildings follow Brazilian rural, small-town and
military architecture of the 1920s; each new building's catalog note says
whether it is a documented type, citing a source in `SOURCES.md` or a
public-domain photograph registered in `docs/assets.md`, or a generic
period type. No real, identifiable building is reproduced as a named place
unless a mission needs it and a source supports it. All models and textures
are original work under CC-BY-4.0. The campaign's multi-perspective
approach and its playable figures are unchanged.

## Capabilities

### New Capabilities

- `structures`: the building and stone catalog, how a building's model and
  its battle data agree, building variants, rock kinds and built stone.

### Modified Capabilities

None. `map-editor` "Structures, posts and objects" and "Every object
affects the battle" already cover any catalog building or stone.

## Impact

- `art-src/blender/target_buildings.py` (and a new stone target);
  `apps/game/public/models/buildings.glb`, 136 KB today, which grows.
- `packages/shared/src/maps`: `catalog-objects.ts`, `openings.ts`,
  `positions.ts` (new buildings' openings and capacity), a variant field in
  the map document (a new version that loads the older ones).
- `packages/view3d`: `battle-map-layer.ts` loses the coded box buildings
  and stones (about 1,375 lines today; the building and stone drawing moves
  to its own module as it is touched).
- `apps/game/src/editor`: the object list, the variant picker.
- Locale catalogs; `docs/assets.md`; the frame budget e2e.
