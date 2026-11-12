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
road, cobbled street, paved road), a width (2–12 m) and an optional drainage
ditch on the left, the right or both sides. A road SHALL paint its material
and SHALL give its surface to the simulation, and SHALL leave the relief as
the author shaped it: it SHALL NOT flatten, sink or camber the ground. The
author shapes a road's bed with the relief tools. A ditch SHALL dig its own
channel beside the road (0.8 m deep, 1.5 m wide) and give the cover of a
shallow trench. Road points SHALL be movable, insertable and deletable after
drawing, and the road SHALL rebuild.

#### Scenario: Dirt road with ditch
- **WHEN** the author draws a 5 m dirt road with a right-side ditch
- **THEN** the road reads as dirt road for speed, and a man prone in the ditch has trench cover

#### Scenario: Road follows the relief
- **WHEN** the author draws a road across a hillside and plays the map
- **THEN** the ground height under the road's centre is the height the relief tools gave it, unchanged by the road

#### Scenario: Edit a road point
- **WHEN** the author drags a road's middle point 10 m sideways
- **THEN** the road's line, paint and ditch follow it, and the old line shows the ground's own paint again

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
covers (sandbags, barricade) and props. Trenches SHALL NOT be catalog
objects; they are trench lines. The stone group SHALL hold several kinds:
small rock, boulder, large boulder (matacão), rock outcrop, lajedo slab,
stone pile and scattered pebbles. Walls and fences SHALL be drawn as
polylines with a height, and SHALL produce the cover and sight blocking
their height gives (a wall at or above 1.75 m blocks sight). Objects SHALL
snap to a 1 m, 0.5 m or free grid, rotate in 15° steps or freely, follow the
ground, and be selected, moved, duplicated and deleted, alone or as a group.
Catalog names SHALL be localized in EN and PT-BR. Objects without a finished
model SHALL be shown with their named placeholder.

#### Scenario: Place a house
- **WHEN** the author places a casa-térrea at x 10, y 20, rotated 90°
- **THEN** the house stands on the ground there and blocks movement and sight in the game

#### Scenario: Wall gives cover
- **WHEN** the author draws a 1.2 m dry stone wall and plays the map
- **THEN** a man crouched behind it has low-wall cover and the wall does not block sight

#### Scenario: Placeholder named
- **WHEN** the author places an object with no finished model
- **THEN** it is drawn as its placeholder and the properties panel names it as a placeholder

#### Scenario: No trench object
- **WHEN** the author opens the covers group of the catalog
- **THEN** it lists sandbags and barricade, and no trench object

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
The brush SHALL NOT plant on deep water, fords, bridges, paved or cobbled
roads, building footprints or trench channels. Vegetation left there by an
older document, or by water drawn later, SHALL be listed by the map check as
a warning and SHALL be dropped when the map is compiled.

#### Scenario: Cornfield conceals
- **WHEN** the author paints a cornfield and a man lies in it in the game
- **THEN** he is concealed under the existing concealment rules

#### Scenario: Nothing grows under water
- **WHEN** the author paints capim across a river
- **THEN** the river's cells stay without vegetation and the banks on both sides hold capim

#### Scenario: Water drawn over a field
- **WHEN** the author draws a pond over an existing cornfield and runs the map check
- **THEN** the check warns about vegetation in water, and in the playtest no corn stands in the pond

### Requirement: Gameplay layers

The editor SHALL place both sides' deployment areas (a polygon per side,
named column and legalist) and SHALL show them labelled. A new map SHALL
start with a default area for each side; the author SHALL move, insert and
delete the area's corners and move a whole area. The editor SHALL NOT show
or edit section points: each side's three section starts and its facing
SHALL be derived from the areas when the map is compiled (the starts on the
line across the middle of the area's depth, at 1/5, 1/2 and 4/5 of its
width, rounded to the metre; each side facing the other's area). The map
check SHALL report as errors a derived start that is not walkable or out of
bounds, areas that overlap, and an area with less than half its surface
walkable; these problems SHALL select the side's area when clicked. When the
map objectives capability is present, the editor SHALL also place
objectives with their area, flag point, value, initial owner and localized
name. Labels SHALL be localized in EN and PT-BR.

#### Scenario: Move a deployment point
- **WHEN** the author drags the column's area 20 m north (section points are no longer moved on their own)
- **THEN** the column's three section starts move 20 m north with it and the playtest starts the sections there

#### Scenario: Shape a deployment area
- **WHEN** the author drags a corner of the legalist area
- **THEN** the area follows and the playtest's deployment phase refuses positions outside the new shape

#### Scenario: Point outside its area
- **WHEN** a pond covers a derived legalist section start and the map is checked (a derived start is always inside its area)
- **THEN** the check reports an error that selects the legalist area when clicked

#### Scenario: Stored points are ignored
- **WHEN** a map document still carries hand-placed section points
- **THEN** the compiled map uses the starts derived from its areas

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
folder after validation passes, under its slot: a campaign map for its
mission, a skirmish map by its id. A map saved for the campaign SHALL carry
its mission id, its setting label and a source note; the editor SHALL
refuse to save it without them. The published build SHALL NOT offer this
action.

#### Scenario: Save to project in dev
- **WHEN** the author saves a valid skirmish map named "Forte" to the project on the development server
- **THEN** `forte.map.json` is written in the authored maps folder and the map checks pass on it

#### Scenario: Campaign map needs a source note
- **WHEN** the author saves a campaign map with an empty source note
- **THEN** the save is refused with a message naming the missing field

#### Scenario: Campaign map saved for its mission
- **WHEN** the author saves a valid map made for "05 A Ponte de Verdinho"
- **THEN** the written document carries the mission id `ponte-de-verdinho` and the campaign book's chapter offers to play it

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

### Requirement: Trench lines

The author SHALL draw trench lines as editable polylines, like roads and
walls, of any length from 4 m. A trench line SHALL have a kind (fire trench
or communication trench), a depth (1.2 m, or 0.8 m shallow), and, for a fire
trench, the side its parapet faces, optional firing bays (traverses every
8–10 m) and a parapet of earth or sandbags. Points SHALL be movable,
insertable and deletable, the facing SHALL flip with one key, and the
properties panel SHALL show the trench's length, its cover slots and the
men it can hold. Labels SHALL be localized in EN and PT-BR.

#### Scenario: Draw a long trench
- **WHEN** the author draws a 60 m fire trench with its parapet facing north
- **THEN** the map holds one trench line of 60 m and the panel lists its slots along the fire step

#### Scenario: Short communication trench
- **WHEN** the author draws a 10 m communication trench joining two fire trenches
- **THEN** it has no fire step and no slots, and men can walk along it

#### Scenario: Flip the parapet
- **WHEN** the author selects a fire trench and presses the flip key
- **THEN** its parapet and its slots face the other side

### Requirement: Trees tool

The editor SHALL offer a trees tool in the palette with a scatter brush
(radius, density and a species mix by biome: Atlantic forest edge, cerrado,
caatinga, pasture trees), single-click placement of a chosen species, and an
eraser that removes the trees under the brush. Scattered trees SHALL be
ordinary catalog objects (selectable, movable, with their gameplay
footprint), SHALL keep 2 m clear of each other and of buildings, SHALL NOT
fall in water or on roads, and SHALL be seeded so the same stroke gives the
same trees. Species and biome names SHALL be localized in EN and PT-BR.

#### Scenario: Scatter a cerrado grove
- **WHEN** the author paints a 20 m cerrado stroke at medium density
- **THEN** cerrado trees stand inside the stroke, none closer than 2 m to another, none in water

#### Scenario: Erase trees
- **WHEN** the author erases across part of the grove
- **THEN** the trees under the brush are removed and undo brings them back

### Requirement: Cover preview

The editor SHALL offer a cover overlay that shows every cover slot of the
map as a dot coloured by what it protects (a standing, crouched or prone
man), a badge with the slot count on each cover piece, wall, ditch and
trench line, concealing vegetation hatched, and the slot totals inside each
side's deployment zone. Hovering a piece SHALL show its slots and the arc it
covers. The slots shown SHALL be the ones the game uses for the same map.
Labels SHALL be localized in EN and PT-BR.

#### Scenario: Count the slots of a trench
- **WHEN** the cover overlay is on and a 30 m fire trench is on the map
- **THEN** its badge shows the slot count the game gives that trench, and its dots line the fire step

#### Scenario: Zone totals
- **WHEN** the author adds a stone wall inside the column's deployment zone
- **THEN** the column's slot total in the overlay grows by the wall's slots

### Requirement: Time of day in the editor

The map properties dialog SHALL offer the map's time of day (a slider from
early morning to late afternoon) and the sun direction (a compass bearing).
While either is changed, the editor's view SHALL light the map as the
battle will, so the author sees which slopes stand out. The values SHALL be
saved in the map document, kept by undo and redo, and labelled in PT-BR and
EN.

#### Scenario: Preview while dragging
- **WHEN** the author drags the time of day from midday to late afternoon with the sun from the west
- **THEN** the editor's view darkens the east faces of the hills as the slider moves

#### Scenario: Saved with the map
- **WHEN** the author sets morning, sun from the east, saves the map and plays it
- **THEN** the battle is lit as morning with the sun from the east

### Requirement: Enemy forces in the map properties

The map properties dialog SHALL list the map's enemy presets and let the
author add and remove presets and add and remove their sections, under the
skirmish roster rules: a section that would break them cannot be added and
the reason is shown, with the preset's men and sections counted. Empty
presets SHALL be dropped on apply; a map without presets SHALL say that the
enemy fields the default roster. Applying SHALL be one undoable step.

#### Scenario: Build a preset
- **WHEN** the author adds a preset (three rifle sections), removes one and adds a machine gun, then applies
- **THEN** the compiled map's presets are rifle, rifle, machine gun; a fourth rifle section was refused at 33 men with its reason shown; undo removes the presets

### Requirement: Map thumbnail from the editor view
On the development server, the editor SHALL save the current view, framed by the author with pan and zoom, as the saved map's thumbnail: the centre of the view, cropped square, without the editor overlays. The thumbnail SHALL be the map's preview picture, shown on its sheet on the desk and on the skirmish setup screen. A map not yet saved to the project SHALL be refused with a message asking to save it first.

#### Scenario: The author frames the thumbnail
- **WHEN** the author saves a map to the project, pans and zooms the view, and selects "Use view as thumbnail"
- **THEN** the map's preview picture is the framed view, and its sheet on the desk shows it

#### Scenario: An unsaved map has no thumbnail yet
- **WHEN** the author selects "Use view as thumbnail" on a map that is not in the project
- **THEN** nothing is written and the editor asks to save the map first

### Requirement: North in the editor

The map properties dialog SHALL offer the map's north as a slider from 0 to
355 degrees in 5-degree steps, labelled with the bearing and its
eight-point direction in PT-BR and EN. The editor's view SHALL show a north
arrow in a corner that points to true north and follows the slider while it
moves. The value SHALL be saved in the map document and kept by undo and
redo.

#### Scenario: Arrow follows the slider
- **WHEN** the author sets north to 90 in the map properties
- **THEN** the view's north arrow points to the right

#### Scenario: Saved with the map
- **WHEN** the author sets north to 45, saves, and opens the map again
- **THEN** the dialog shows 45 and the arrow points to the upper right
