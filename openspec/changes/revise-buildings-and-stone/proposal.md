## Why

Of the seventeen buildings in the editor, three (farmhouse, barn, chapel)
are modelled in the art kit; the other fourteen are boxes with a wall and a
roof colour drawn in code, with windows and doors placed by a rule. Stones
are six shapes of one grey rock. The owner asked (2026-11-11) to revise how
the buildings look and to add more buildings and more kinds of stone, and
(2026-11-12) to add the objects a map is still missing: the waterside
(canoes, small boats, a drying line with a net), the farm and the town (a
broken tractor among them), the Column's own camp and train (tents, carts,
barrels), and more kinds of fence and wall. Today the props are eight
(cart, well, haystack, barrel, crate, water trough, woodpile, fallen log)
and the lines seven (taipa, stone, brick, wire, board, picket, hedgerow);
the art kit already has an aid tent the catalog does not offer.

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
- **Waterside objects**, on a bank, a beach or in shallow water: a dugout
  canoe, a rowing boat, a São Francisco river boat (canoa de tolda), a
  jangada, a boat turned over on the sand, a drying line with a fishing
  net, fish traps, a wooden landing stage (trapiche) and mooring posts.
- **Farm objects**: a broken tractor, an ox cart, a plough, a cane press,
  coffee sacks, a hen house, a pigsty, a cart wheel and a millstone.
- **Town objects**: a broken-down motor car and lorry (Ford T and TT
  types), a square bench, a fountain, a market stall, kerosene and petrol
  tins in their crates, an enamelled street sign and a kiosk.
- **The Column's camp and train**: canvas tents (a ridge tent, a bell tent,
  the aid tent the kit already has, a poncho lean-to), carts and pack
  saddles, barrels and ammunition boxes, a campfire with its pot, a rifle
  stack, saddles on a rail and a horse line (the posts and rope, no
  animals), and a 75 mm field gun left behind. The legalist side gets the
  same camp in its own looks where the sources say they differ.
- **More kinds of fence and wall**, as new line kinds beside the seven
  present ones: a rail fence (tronqueira), a bamboo or taquara fence, a
  wattle fence (pau-a-pique), an adobe wall, a whitewashed wall with a
  coping, and an iron railing for the town.
- Every new object and line is a full catalog entry, with its cover and
  whether it blocks sight or movement, and works in the editor and in
  battle as the present ones do; the owner picks which candidates are made
  (task 1.1).
- All names in PT-BR and EN.

Design intent. Player fantasy: fighting for real places (a station, a
chapel, a farm's stone corral), not for boxes. Pillar: terrain you can
read, and history you can play. Loop beat: authoring a map; choosing which
position to take and hold in battle. Hypothesis: a player tells at a glance
which building can be garrisoned upstairs and from which side it can be
fired on, because the model shows it.

MVP: the seventeen present buildings remodelled with openings that agree
with the battle, at least eight new buildings, five rock kinds in three
sizes, built stone in two kinds, at least eight new objects across the
waterside, the farm and the town, the Column's camp (tents, carts, barrels,
ammunition boxes, a campfire), and three new kinds of fence or wall.
Non-goals: animals (a horse line is posts and rope), boats that move or
carry men (the ferry stays as it is), destructible or burning
buildings, interiors, furniture, new garrison mechanics, bridges and
fortifications (their own kits), and a town generator.

Historical and legal note. The Column crossed the Paraná at Porto Mendes
with about 1,500 men, 600 horses and mules and three 75 mm guns, later
hidden in Mato Grosso (`docs/history/FORCES.md`, Macaulay pp. 87-89); the
river boats, the horse line and the abandoned gun rest on that, and each
camp object's note says whether it is documented or a generic period type.
Every object is of the 1920s in the interior of Brazil: no steel fuel
drums, concrete, plastic or later vehicles. The Column never reached the sea: the sea objects are for skirmish maps.
The tractor is a 1910s imported type (the Fordson, sold in Brazil from
about 1917) and needs a source in task 1.1 or is marked a generic period
type. Buildings follow Brazilian rural, small-town and
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
  its battle data agree, building variants, rock kinds and built stone; the
  waterside, farm, town and camp objects; the kinds of fence and wall.

### Modified Capabilities

None. `map-editor` "Structures, posts and objects" and "Every object
affects the battle" already cover any catalog building or stone.

## Impact

- `art-src/blender/target_buildings.py` (and a new stone target);
  `art-src/blender/target_props.py` for the new objects (or one target per
  group as it grows); `apps/game/public/models/props.glb`;
  `apps/game/public/models/buildings.glb`, 136 KB today, which grows.
- `packages/shared/src/maps`: `catalog-objects.ts` (new props, a `camp`
  and a `water` group, new `LineKind`s appended), `openings.ts`,
  `positions.ts` (new buildings' openings and capacity), a variant field in
  the map document (a new version that loads the older ones).
- `packages/view3d`: `battle-map-layer.ts` loses the coded box buildings
  and stones (about 1,375 lines today; the building and stone drawing moves
  to its own module as it is touched).
- `apps/game/src/editor`: the object list, the variant picker.
- Locale catalogs; `docs/assets.md`; the frame budget e2e.
