## MODIFIED Requirements

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

## ADDED Requirements

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
