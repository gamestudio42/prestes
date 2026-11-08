# map-editor Specification

## Purpose
A browser map editor in which the author builds battle and campaign maps
visually — terrain, ground textures, roads, water, structures, objects and
deployment — and saves them as map documents the game loads.

## Requirements

### Requirement: Editor page

The game build SHALL include a map editor as its own page, loaded separately
from the game so the game's bundle does not grow with it. The editor SHALL
draw the map with the game's own renderer (orthographic camera, toon
shading, pixel post) and SHALL offer a top-down 2D mode with a metre grid.
It SHALL have a tool palette, a layer panel (terrain, paint, water, roads,
structures, objects, vegetation, gameplay), a properties panel for the
selected object, a status line with the cursor position (x, y in metres and
height) and keyboard shortcuts for every tool. The camera SHALL pan, zoom and
rotate as in the game.

#### Scenario: Editor opens on its own page
- **WHEN** the author opens the editor page
- **THEN** the editor shows an empty map or the last autosaved map, and the game's own entry script is not loaded

#### Scenario: Game bundle unchanged by the editor
- **WHEN** the bundle check runs
- **THEN** the game's initial bundle stays within its budget and the editor is reported as a separate chunk

#### Scenario: Cursor readout
- **WHEN** the cursor is over the ground at x 12, y −40
- **THEN** the status line shows those coordinates and the terrain height there

### Requirement: Map sizes

A new map SHALL be created in one of three sizes: small (240 × 240 m),
medium (400 × 400 m) or large (640 × 640 m), centred on the origin. The
author SHALL be able to change the size of an existing map; growing it SHALL
extend every layer around the centre with flat base ground, and shrinking it
SHALL crop every layer and SHALL list the objects that would fall outside
before it is applied.

#### Scenario: Create a medium map
- **WHEN** the author creates a new medium map
- **THEN** its bounds are −200 to 200 m on both axes, flat, painted with the base material

#### Scenario: Shrink warns about objects
- **WHEN** the author shrinks a large map with a building at x 280 to medium
- **THEN** the editor lists that building as outside the new bounds and applies the change only after confirmation

### Requirement: Pixel-art texture brush

The editor SHALL paint ground materials on a 1 m paint grid. The material
library SHALL hold at least: grass, dry grass, packed earth, red earth, mud,
sand, gravel, stone, cobbles, quintal floor, leaf litter and field soil, plus
the biomes the column crossed: for the cerrado, cerrado red soil
(latossolo), cerrado grass (campo limpo) and cerrado litter; for the
Nordeste caatinga, cracked caatinga soil, caatinga dry grass, lajedo (bare
rock pavement) and loose pebbles (seixos).
Besides these detailed textures the palette SHALL offer basic colours:
near-flat tiles (green, dark green, olive, straw, brown, red, ochre, grey,
dark brown, pale sand), each with its surface, for large areas and
finishing, so a map need not be all pattern. The palette SHALL show the two
groups apart, basic first. Detailed tiles SHALL keep a low contrast between
their tones so they do not tire the eye at a distance.
Each material SHALL be an original pixel-art tile drawn without smoothing
(nearest filtering, world-space so tiles line up across cells), and the
boundary between two materials SHALL be drawn as a pixel dither, not a blur.
Each material SHALL map to a gameplay surface, shown in its tooltip with its
speed and cover effect. The brush SHALL have a size (1–32 m), a shape (round
or square), a strength (the dither density of a stroke) and an eraser that
restores the base material; a fill tool SHALL flood a connected area of one
material. Material names SHALL be localized.

#### Scenario: Paint mud
- **WHEN** the author paints mud with a 4 m round brush at a point
- **THEN** the cells within 2 m of it show the mud tile and report the mud surface

#### Scenario: Painted surface reaches the simulation
- **WHEN** a map with a mud patch is played
- **THEN** a section crossing the patch moves at the mud speed factor

#### Scenario: Dithered edge
- **WHEN** grass and gravel meet
- **THEN** the view draws a pixel dither between them and no blurred blend

#### Scenario: Fill
- **WHEN** the author fills inside a closed ring of cobbles with packed earth
- **THEN** every cell inside the ring becomes packed earth and nothing outside it changes

### Requirement: Elevation tools

The editor SHALL shape the terrain on the map's 2 m heightfield with these
brushes: raise, lower, smooth, flatten (to the height sampled where the
stroke started), set height (to a typed value) and noise (seeded, so the
same stroke on the same map gives the same result). Heights SHALL stay within
−12 m and +40 m. Brush size and strength SHALL be adjustable, with a smooth
falloff. A big noise brush SHALL make rolling hills and a small one rough
ground (the noise scale follows the brush). The editor SHALL offer a relief
view that colours the ground by height (low to high, with a legend of the
map's lowest and highest ground), shades it as lit from the north-west, and
draws contour lines every 1 m with a bolder line every 5 m; choosing a
terrain tool SHALL turn the relief view on when no other view is chosen.
It SHALL also offer the contour lines alone and a slope overlay (colouring
ground steeper than the game's slow and impassable thresholds).

#### Scenario: Raise a hill
- **WHEN** the author holds the raise brush on a point for one second at full strength
- **THEN** the height at that point grows and the heights fall off smoothly to the brush edge

#### Scenario: See the relief
- **WHEN** the author picks the raise tool on a map with a 6 m hill and no view chosen
- **THEN** the relief view comes on, the hill is tinted from low to high colours with six 1 m contour rings, the fifth one bold, and the legend reads the lowest and highest ground

#### Scenario: Height clamp
- **WHEN** the author keeps raising a point past +40 m
- **THEN** its height stays at +40 m

#### Scenario: Noise is seeded
- **WHEN** the same noise stroke is applied to two copies of the same map
- **THEN** both heightfields are equal

### Requirement: Roads

The author SHALL draw roads as editable polylines with a type (trail, dirt
road, cobbled street, paved road), a width (2–12 m), a camber and an
optional drainage ditch on the left, the right or both sides. A road SHALL
flatten the terrain across its width along its line, SHALL sink into the
ground by its type's depth, SHALL paint its material and SHALL give its
surface to the simulation. A ditch SHALL lower the ground beside the road and
give the cover of a shallow trench. Road points SHALL be movable,
insertable and deletable after drawing, and the road SHALL rebuild.

#### Scenario: Dirt road with ditch
- **WHEN** the author draws a 5 m dirt road with a right-side ditch
- **THEN** the road reads as dirt road for speed, and a man prone in the ditch has trench cover

#### Scenario: Edit a road point
- **WHEN** the author drags a road's middle point 10 m sideways
- **THEN** the road's line, terrain cut and paint follow it and the old line returns to the ground beneath it

### Requirement: Water and crossings

The author SHALL draw rivers as polylines with a width and a kind per
stretch (deep or ford), and ponds and lakes as polygons, and SHALL set the
map's water level. Deep water SHALL be impassable and fords walkable and slow,
as in the existing battle maps. The author SHALL place bridges and ferry
crossings; a bridge SHALL span deep water and SHALL be walkable.

#### Scenario: Deep river blocks
- **WHEN** a map with a deep river and no crossing is validated
- **THEN** the validation reports the deployment zones as unreachable from each other

#### Scenario: Bridge crossing
- **WHEN** a bridge is placed across the deep river
- **THEN** the validation finds a path between the deployment zones over the bridge

### Requirement: Structures, posts and objects

The editor SHALL place objects from a catalog grouped as buildings (every
building model the game has), walls (taipa, dry stone, plastered brick),
fences (wire and post, board, picket, hedgerow), posts (street lamp,
telegraph pole, flagpole, hitching post), trees (including cerrado trees,
buriti, and caatinga plants: mandacaru, xique-xique, juazeiro), stones,
covers (sandbags, trench line, barricade) and props. The stone group SHALL
hold several kinds: small rock, boulder, large boulder (matacão), rock
outcrop, lajedo slab, stone pile and scattered pebbles. Walls and fences
SHALL be drawn as polylines with a height, and SHALL produce the cover and
sight blocking their height gives (a wall at or above 1.75 m blocks sight).
Objects SHALL
snap to a 1 m, 0.5 m or free grid, rotate in 15° steps or freely, follow the
ground, and be selected, moved, duplicated and deleted, alone or as a group.
Catalog names SHALL be localized. Objects without a finished model SHALL be
shown with their named placeholder.

#### Scenario: Place a house
- **WHEN** the author places a casa-térrea at x 10, y 20, rotated 90°
- **THEN** the house stands on the ground there and blocks movement and sight in the game

#### Scenario: Wall gives cover
- **WHEN** the author draws a 1.2 m dry stone wall and plays the map
- **THEN** a man crouched behind it has low-wall cover and the wall does not block sight

#### Scenario: Placeholder named
- **WHEN** the author places an object with no finished model
- **THEN** it is drawn as its placeholder and the properties panel names it as a placeholder

### Requirement: Every object affects the battle

Every object the editor places SHALL have a gameplay footprint, declared in
its catalog entry and shown in the properties panel: whether it blocks
movement, the cover it gives (kind and quality, by its height and width),
whether it blocks sight (at or above 1.75 m and wide enough to hide a man,
0.5 m or more), and the concealment it gives if it is foliage. Thin objects
(posts, poles, narrow trunks under 0.5 m) SHALL block movement and give no
cover and no sight blocking. No placed object SHALL be view-only, except
ground decals that the catalog marks as flat (pebbles, leaf patches), which
change only the surface under them.

#### Scenario: Boulder gives cover and hides
- **WHEN** a 2 m boulder stands between a standing man and an enemy in the game
- **THEN** the man is hidden from the enemy and has stone cover against his fire

#### Scenario: Small rock gives prone cover only
- **WHEN** a man lies behind a 0.6 m rock
- **THEN** he has stone cover while prone, and the rock does not block a standing man's sight

#### Scenario: Cart gives cover
- **WHEN** a man crouches behind a placed cart
- **THEN** he has cover from it, and men cannot walk through it

#### Scenario: Post blocks only movement
- **WHEN** a telegraph pole stands on the line between two men
- **THEN** it does not hide either man, and a man cannot walk through its footprint

#### Scenario: Tree trunk and canopy
- **WHEN** a man stands behind a broad tree
- **THEN** its trunk gives him cover from the far side, and the tree is listed with its footprint in the properties panel

#### Scenario: Cactus clump conceals
- **WHEN** a man lies in a xique-xique clump
- **THEN** he has the scrub concealment of the game's concealment rules

### Requirement: Vegetation

The author SHALL paint vegetation areas (corn, cane, tall grass, scrub) with
a brush and an eraser, and SHALL see them drawn as the game draws them. The
vegetation SHALL give the concealment the game's concealment rules define.

#### Scenario: Cornfield conceals
- **WHEN** the author paints a cornfield and a man lies in it in the game
- **THEN** he is concealed under the existing concealment rules

### Requirement: Gameplay layers

The editor SHALL place both sides' deployment zones (three section points
and a facing per side, named column and legalist) and SHALL show them
labelled. When the map objectives capability is present, the editor SHALL
also place objectives with their area, flag point, value, initial owner and
localized name.

#### Scenario: Move a deployment point
- **WHEN** the author drags the column's second section point
- **THEN** the map document stores the new point and the playtest starts that section there

### Requirement: Undo and redo

Every edit (stroke, placement, move, delete, property change, resize) SHALL be
one undoable step. The editor SHALL keep at least 200 steps, with Ctrl+Z to
undo and Ctrl+Y or Ctrl+Shift+Z to redo.

#### Scenario: Undo a stroke
- **WHEN** the author paints a stroke and presses Ctrl+Z
- **THEN** every cell the stroke changed returns to its previous material

### Requirement: Validation in the editor

The editor SHALL run the battle map checks on demand and before every save
to the project: both deployment zones inside the bounds, on dry walkable
ground, at least 160 m apart, with a walkable path between them; objects
inside the bounds; no buildings overlapping; bridges over water. It SHALL
warn (not refuse) when a stretch of more than 60 m on the line between the
deployment zones has no cover. Each problem SHALL be listed with a localized
message, and selecting it SHALL move the camera to the spot.

#### Scenario: Problem jumps to spot
- **WHEN** a deployment point is inside a pond and the author selects that problem
- **THEN** the camera centres on the point and the point is selected

### Requirement: Save, export and import

The editor SHALL autosave the open map to the browser's local storage for
the editor at most every 10 s after a change, and SHALL restore it on the
next visit. It SHALL export the map as a versioned map document file
(`<id>.map.json`) and import such a file. Importing a document from an older
format version SHALL migrate it; a document from a newer version or with
invalid data SHALL be refused with a localized message and SHALL NOT replace
the open map.

#### Scenario: Round trip
- **WHEN** the author exports a map and imports the file into a fresh editor
- **THEN** the imported map compiles to the same battle map as the exported one

#### Scenario: Invalid file
- **WHEN** the author imports a file that is not a map document
- **THEN** the editor shows an error and the open map is unchanged

### Requirement: Save to the project

When the editor runs on the development server, it SHALL offer "save to
project", which writes the map document into the project's authored maps
folder after validation passes. A map saved for the campaign SHALL carry
its setting label and a source note; the editor SHALL refuse to save it
without them. The published build SHALL NOT offer this action.

#### Scenario: Save to project in dev
- **WHEN** the author saves a valid map named "Forte" to the project on the development server
- **THEN** `forte.map.json` is written in the authored maps folder and the map checks pass on it

#### Scenario: Campaign map needs a source note
- **WHEN** the author saves a campaign map with an empty source note
- **THEN** the save is refused with a message naming the missing field

#### Scenario: Not in the published build
- **WHEN** the editor runs from the published build
- **THEN** "save to project" is not shown and export is offered instead

### Requirement: Playtest

The editor SHALL open a 3 vs 3 skirmish on the open map in one action,
without saving it to the project, with the default rosters. Returning from
the battle SHALL bring the author back to the editor with the map unchanged.

#### Scenario: Playtest
- **WHEN** the author presses playtest
- **THEN** the skirmish starts on the edited map with both sides in its deployment zones

### Requirement: Editor localization

Every editor string (tools, layers, materials, catalog entries, properties,
problems, dialogs) SHALL come from the locale catalog in PT-BR and EN, and the
editor SHALL follow the game's language setting. A map document SHALL carry
its name and description in both languages.

#### Scenario: Language follows the game
- **WHEN** the game language is PT-BR and the author opens the editor
- **THEN** the tool palette and panels are in Portuguese

#### Scenario: Map name in both languages
- **WHEN** the author saves a map with only the PT-BR name filled
- **THEN** validation reports the missing EN name
