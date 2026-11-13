# Buildings review (revise-buildings-and-stone 1.2)

`sheet-before.png` shows every catalog building as the battle draws it on
2026-11-12, from the front and the back, at the tactical camera band. The
single pictures are in `before/`. They are rendered by
`tests/e2e/review-buildings.spec.ts` on a throwaway map:

    PRESTES_REVIEW=1 npx playwright test tests/e2e/review-buildings.spec.ts

The same test with `PRESTES_REVIEW_OUT=docs/review/buildings/after` makes
the "after" pictures once the models are in.

Only the farmhouse, the barn and the chapel are models today; the other
fourteen are boxes drawn in code. Doors, windows, upper floors and the
church tower are battle data (`packages/shared/src/maps/openings.ts`) and
do not move; the model is fitted to them.

## Features each building gains (approved by the owner, 2026-11-12)

All of the 1920s interior of Brazil. "Upper" is the battle's upper floor or
loft, which the model must show.

| # | Building | Today | Suggested features |
| --- | --- | --- | --- |
| 1 | farmhouse (casa de sítio) | model | tiled hip roof, a small front alpendre, wooden shutters, whitewash worn over a plinth |
| 2 | barn (paiol) | model | raised on stone piles, board walls, a wide door, a loft hatch |
| 3 | chapel (capela) | model | a bell gable with a cross, whitewash with coloured trim |
| 4 | casa-sede | box; loft | four-water tiled roof, a full-width veranda on posts, loft vents, front steps |
| 5 | colonist-house (casa de colono) | box | wattle and daub, two-water roof of tile or zinc, a lean-to kitchen with a chimney |
| 6 | engenho | box; loft | an open-sided mill shed, a tall brick chimney, the cane-press side |
| 7 | ferry-house (casa da balsa) | box | on short stilts by the bank, a lean-to, a plank landing |
| 8 | terraced-house (casa geminada) | box | a platband façade with a cornice, a door and two windows, shared side walls |
| 9 | terraced-house-wide | box | the same, three windows and plaster mouldings |
| 10 | sobrado | box; storey | two floors, an iron balcony upstairs, a cornice, shop doors below |
| 11 | casa-terrea (casa térrea) | box | hip roof with eaves, framed windows, wall colour variants |
| 12 | venda | box | wide double doors, a porch roof, a painted sign board |
| 13 | armazem (armazém) | box | tall double doors, a loading platform, zinc roof |
| 14 | coreto | box | an octagonal bandstand on a plinth, a railing, a pointed roof |
| 15 | church (igreja matriz) | box; tower | the bell tower, a pediment façade, front steps, tall side windows |
| 16 | factory (fábrica) | box; storey | brick walls, a row of gable roofs, a tall chimney, the upper floor's windows |
| 17 | warehouse (galpão) | box; storey | zinc gable roof, sliding doors, a rail-side platform |

## Roof and feature library (3.1)

`sheet-kit.png` shows the library in `art-src/blender/buildings_kit.py`,
one sample per roof form and feature, with the battle's openings of a real
building where the sample is one (from `art-src/blender/openings.json`).
Rendered from the tactical angle toward the street face by:

    blender -b --factory-startup -P art-src/blender/review_buildings_kit.py -- <out_dir>

Roofs: hip, half-hip, gable (tile, old tile), thatch, zinc, lean-to and
platband. Features: cornice, dado band, worn plaster, framed windows with
shutters, doors with a step, alpendre/veranda on posts, chimney, awning,
sign board, iron balcony, bell gable with cross, bell tower, steps, piles.

Approved by the owner, 2026-11-12.

## Rural buildings (3.2)

`sheet-rural.png` sets the seven rural buildings before and after, front
and back, as the battle draws them; the single pictures are in `after/`.
All seven pass the model check (`pnpm check:content`).

Approved by the owner, 2026-11-12.

## Town buildings (3.3)

`sheet-town.png` sets the ten town buildings before and after, front and
back. All seventeen buildings are models now and pass the model check; the
coded boxes are no longer drawn (their code goes in 3.6).

Approved by the owner, 2026-11-12.

## New buildings (3.4)

`sheet-new.png` shows the thirteen new buildings, front and back. Rural:
wattle-and-daub house, thatched rancho, flour house. Town: railway station,
telegraph office, jail, town hall, school, market shed, water tank.
Military: barracks block, guardhouse, depot. The stone corral and the
cemetery wall are built stone and walls (4.2, 5.3), the wayside cross an
object (5.1). Sources are noted on each catalog row.

Approved by the owner, 2026-11-12.

## Variants (3.5)

`sheet-variants.png` shows a casa terrea in each look, set with the
editor's picker by `tests/e2e/review-building-variants.spec.ts`: as built,
whitewash, ochre, blue, rose, bare adobe (old tiles) and zinc roof. A look
swaps atlas swatches on the model in the view; the battle never reads it.

Approved by the owner, 2026-11-12.

## Rock kinds (4.1)

`sheet-stones.png` shows each stone (small rock, boulder, matacao, pile,
outcrop) in each rock kind, rendered from `stones.glb` by
`art-src/blender/review_stones.py`: granite (the old look), basalt,
sandstone, quartzite with canga, river cobble and lajedo. The angular kinds
are faceted, not boxes. A kind is the map document's `variant` on a stone and
lands on `prop.kind`; cover and sight stay the size's
(`packages/shared/test/rock-kinds.test.ts`). The editor picker comes in 4.3.

Approved by the owner, 2026-11-12.

## Built stone (4.2)

`sheet-built-stone.png` shows, in each rock kind, three 2 m pieces of a dry
stone wall, the retaining wall and the stone steps, rendered from
`stones.glb` by `art-src/blender/review_built_stone.py`. The dry stone wall
is the `stone-wall` line with a rock kind (the line's `variant`), drawn as
the `dry-wall` model in pieces of at most 2 m set on the ground and sunk into
it. The stone corral (generic period type) compiles to dry stone wall lines
round its footprint with a 3 m gate in front; the retaining wall gives
low-wall cover; the steps are walked over. Tests: a wall down a hillside in
`battle-map-walls.test.ts` and cover along it and in a corral in
`packages/simulation/test/built-stone.test.ts`.

Approved by the owner, 2026-11-13.

## Editor (4.3)

`sheet-editor-stones.png` shows the editor's stone list in each rock kind,
saved by `tests/e2e/editor-rock-kinds.spec.ts` (with PRESTES_REVIEW=1): the
kind is chosen first and every stone is pictured in it (the lajedo slab
comes in one rock). The line tool offers the kinds for a dry stone wall, and
the selection panel changes a stone's, corral's or wall's kind. Names in EN
and PT-BR.

Approved by the owner, 2026-11-13.

## Waterside, farm and town objects (5.1)

`sheet-objects.png` shows the 29 approved objects, rendered from
`props.glb` by `art-src/blender/review_objects.py` (builders in
`art-src/blender/props_objects.py`): twelve waterside, nine farm, eight
town. Each catalog row has its footprint, height and cover class (D9): wood
covers like a barrel, iron and stone like stone, sacks like sandbags, posts
and nets are thin. The waterside objects are the editor's new `water`
group; the farm and town objects are props under their own sub-headings. A
waterside object in water is drawing only (no cover, no block) and rides on
the surface: `waterside-afloat.png`, taken by
`tests/e2e/review-waterside.spec.ts`, shows a canoe and a canoa de tolda
afloat and a canoe drawn up on the bank. Tests:
`packages/shared/test/waterside-objects.test.ts` and
`packages/simulation/test/waterside-cover.test.ts`.

Approved by the owner, 2026-11-13.

## Camp and train (5.2)

`sheet-camp.png` shows the thirteen camp objects built in the props target
(`art-src/blender/camp_objects.py`), rendered by
`art-src/blender/review_objects.py --camp`; the fourteenth, the aid tent, is
the kit's. They are the editor's new camp group. After the owner's first look
(2026-11-13) the pack saddles and the horse line went, the campfire's tripod
meets over the pot, and a field kitchen and a mess tent were added. Canvas gives no cover;
boxes, barrels, carts and saddles cover like a barrel; the abandoned 75 mm
gun like stone. Where the sources differ (D11) a camp object comes per side:
the Column's worn, patched canvas and requisitioned boxes, or the
government's issue canvas and painted boxes, set with the selection
panel's side picker. `camp-sides.png` (taken by
`tests/e2e/review-camp.spec.ts`) shows the tents, the kitchen, the mess, the
lean-to, the boxes and the cart in the Column's looks (behind) and the government's (in front).
The side is drawing only: `packages/simulation/test/camp-sides.test.ts`
runs both camps to the same hashes tick by tick.

Approved by the owner, 2026-11-13.

## Fences, walls and gates (5.3)

`sheet-fences.png` shows the six fences and walls appended to the line
kinds (D10), drawn in the editor by `tests/e2e/review-fences.spec.ts`, back
to front: a rail fence (tronqueira), a taquara bamboo fence, a wattle fence
(pau-a-pique), an adobe wall, a whitewashed wall with its coping and capped
pillars, and an iron railing on a plastered base. At the owner's asking the
pack also has four gates, standing open: a farm gate (porteira), a rail gate
with its rails slid out, a yard gate of boards and an iron gate between
plastered pillars. A gate is placed in a gap left in a line, its half width
reaching its posts so the line meets them; the close shots show the gates in
their gaps, the strip below them the models (props target,
`review_objects.py`). After the owner's first look (2026-11-13) the rail
gate's crossing rail went, the farm gate's brace was set in its plane, the
coped wall's pillars stand every third piece and the yard gate is as wide as
its gap.

A wall covers as a wall of its height; a rail fence or an iron railing gives
none; the bamboo and wattle fences hide a man at full height but stop no
bullet; an open gate is drawn only, gives no cover and is walked through
(`packages/simulation/test/fences-cover.test.ts`). Each line follows a
hillside (`packages/view3d/test/fences-on-slope.test.ts`), and a version 7
map's lines load unchanged (`packages/shared/test/line-kinds.test.ts`).

Approved by the owner, 2026-11-13.
