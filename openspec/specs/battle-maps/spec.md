# battle-maps Specification

## Purpose
Defines the battle maps the 3 vs 3 is fought on: the catalog of hand-written and
authored maps, the map documents the editor saves, their sizes and the proof
map that shows the document pipeline carries a real battlefield.

## Requirements

### Requirement: Authored map documents

A battle map SHALL be loadable from a versioned map document (the editor's
file format); every battle map is authored (the hand-written maps were
removed in author-game-maps 3.6). Compiling a document SHALL be a pure,
deterministic step: the same document SHALL give the same battle map, bit
for bit, in the simulation and the view threads. A compiled document SHALL
carry a setting label, a source note, valid deployment areas and a localized
name and description.

#### Scenario: Deterministic compile
- **WHEN** the same map document is compiled twice and the same 3v3 runs 1,000 ticks on each
- **THEN** both runs end with the same state hash

#### Scenario: Same data in both threads
- **WHEN** the simulation and the view load the same authored map
- **THEN** height, surface, water and cover sampled at the same position agree

#### Scenario: Hand-written maps unchanged
- **WHEN** the determinism check runs
- **THEN** the test map's (`campo-de-provas`) 3v3 and mixed-roster goldens match, or are re-recorded with a stated reason

### Requirement: Authored maps in the catalog

Map documents in the project's authored maps folder SHALL be registered in
the map catalog at build time. The skirmish maps SHALL be offered on the
skirmish page; campaign maps SHALL be reached through their chapter; the
test map SHALL be offered only in development builds and the sandbox panel.
The content check SHALL compile and validate every authored map and SHALL
fail the check on any error.

#### Scenario: Authored map on the menu
- **WHEN** a valid skirmish map `forte.map.json` is in the authored maps folder and the game is built
- **THEN** the skirmish page lists the map with its localized name

#### Scenario: Campaign map stays off the skirmish page
- **WHEN** a campaign map for "02 O Anel de Ferro" is in the authored maps folder
- **THEN** the skirmish page does not list it and its chapter offers to play it

#### Scenario: Broken authored map fails the check
- **WHEN** an authored map's deployment zone is in deep water
- **THEN** the content check fails naming the map and the problem

### Requirement: Map sizes up to 640 m

Battle maps SHALL support square bounds of 240 m, 400 m and 640 m. Terrain,
water, vegetation, pathfinding, vision and the camera limits SHALL cover the
whole of the active map's bounds. A 3 vs 3 with the default rosters SHALL
stay within 3 ms a tick on the small and medium sizes and within 4 ms on the
large size, measured by the battle benchmark.

#### Scenario: Path across a large map
- **WHEN** a section is ordered from one corner of a large flat map to the opposite corner
- **THEN** it receives a walkable path and reaches the destination

#### Scenario: Large map budget
- **WHEN** the benchmark runs a 3 vs 3 on the large proof map
- **THEN** the mean tick time is under 4 ms

### Requirement: Map definition

A battle map SHALL be one data definition that both the simulation and the
view read: its bounds, heightfield, surfaces, water and crossings,
vegetation, buildings, covers, sight obstacles, props and both sides'
deployment zones and defensive lines. The simulation and the view SHALL NOT
keep their own copy of any of these. Loading a map SHALL be deterministic:
the same map id SHALL give the same terrain, covers and deployment every
time. Every map SHALL declare a setting label (historical setting with a
fictional place) and a source note.

#### Scenario: Same data in both threads
- **WHEN** the simulation and the view load the same map
- **THEN** height, surface and cover sampled at the same position agree

#### Scenario: Deterministic load
- **WHEN** the same map is loaded twice and the same 3v3 runs 1,000 ticks on each
- **THEN** both runs end with the same state hash

#### Scenario: Map validation
- **WHEN** the content check runs
- **THEN** every map has both deployment zones inside its bounds, on walkable ground, at least 160 m apart, with a walkable path between them

### Requirement: Map bounds and pathfinding

Each map SHALL define its own bounds. Movement orders, pathfinding and
spawning SHALL use the active map's bounds and walkable area, so that a
soldier can reach any walkable point of a map up to 400 × 400 m. Points
outside the bounds, in deep water or inside buildings SHALL NOT be order
targets.

#### Scenario: Far corner reachable
- **WHEN** a section is ordered to a walkable point near a corner of the test map
- **THEN** it finds a path and arrives there

#### Scenario: Order into deep water
- **WHEN** the player orders a section to a point in the river away from any crossing
- **THEN** the order is refused or moved to the nearest walkable bank

### Requirement: Start view and deployment marks

When a 3 vs 3 starts on a battle map, the camera SHALL open at tactical zoom
centred on the player's sections. For the first 10 s the view SHALL mark the
player's deployment zone and the enemy's side with localized labels (PT-BR
and EN). A key (Home) SHALL frame the whole map at strategic zoom.

#### Scenario: Camera on the sections
- **WHEN** the 3 vs 3 starts on any battle map
- **THEN** the player's first section is inside the view at tactical zoom

#### Scenario: Frame the map
- **WHEN** the player presses Home
- **THEN** the whole map is in view

### Requirement: Map previews

The skirmish page SHALL show, for each battle map, a small pixel preview
rendered from the map's own scene by a project tool, with the deployment
zones marked. Previews SHALL be committed images regenerated by the tool,
and a missing preview SHALL fall back to the map's name only.

#### Scenario: Preview on the menu
- **WHEN** the player opens the skirmish page
- **THEN** each map entry shows its preview image

#### Scenario: Regenerated
- **WHEN** the preview tool runs after a map changes
- **THEN** that map's preview image is rewritten from the current scene

### Requirement: Period look of the battle maps

Until the Blender kits exist, the battle maps' named placeholders SHALL read
as 1920s Brazil: quintal walls as plastered brick with a coping and fences
as wooden boards or wire on posts; one-storey houses with a door on the
street and tiled roofs; vendas with a wide door and an awning; the matriz
with a façade and a tower; the coreto with a roof on posts; riverbanks with
gravel and reeds. No real building, brand or shop name SHALL be shown.

#### Scenario: Walls read as walls
- **WHEN** a walled yard on an authored map is seen at tactical zoom
- **THEN** quintal walls are drawn as plastered walls and fences as board fences, not as stone blocks

### Requirement: Roadside ditches

Dirt roads on the battle maps SHALL have drainage ditches (valas) along
their edges where the map says so: channels 0.8 m deep and 1.5 m wide sunk
into the heightfield. A soldier in a ditch SHALL receive trench-like cover
when crouched or prone against a threat outside it, SHALL move at the
trench-floor speed along it, and SHALL be able to take a cover slot in it.

#### Scenario: Cover in the ditch
- **WHEN** a soldier lies prone in a road ditch and an enemy fires from the open field
- **THEN** he receives the ditch's cover

#### Scenario: Slots along the ditch
- **WHEN** a section is ordered to defend at the roadside of a ditched road
- **THEN** its men take slots in the ditch

### Requirement: Crops and grass look

On every battle map, hand-written or authored, cornfields SHALL be drawn as
rows of stalks with leaf cards and tassels, canefields as dense segmented
stalks with long leaves, tall grass (capim) as clumps of 8–14 thin
blade-shaped cards fanning from the base, and scrub as low bushes; none of
them SHALL be drawn as cones. Fields SHALL thin out at their edge and sway
gently. The look SHALL NOT change concealment, which stays a simulation
rule, and SHALL keep the frame budget at strategic zoom.

#### Scenario: Capim as blades
- **WHEN** a capim clump is seen at tactical zoom
- **THEN** it is drawn as blades fanning from its base, with no conical shape

#### Scenario: Corn in rows
- **WHEN** a cornfield is seen at tactical zoom
- **THEN** its stalks stand in parallel rows with leaves and tassels

#### Scenario: Same concealment
- **WHEN** the determinism check runs after the new plant look
- **THEN** the battle goldens are unchanged by the look

### Requirement: Vegetation grows only on land

No vegetation SHALL stand or conceal in deep water, fords, on bridges, on
paved or cobbled roads, inside building footprints or in trench channels, on
any battle map.

#### Scenario: Ford without scrub
- **WHEN** an authored map whose document has scrub cells on a ford is compiled and a man crouches on the ford
- **THEN** no scrub is drawn on the ford and the man is not concealed

### Requirement: Trench lines in battle

A trench line SHALL lower the ground along its line to its depth over a
1.5 m wide floor and raise a parapet on its fire side. A man on the fire step
of a fire trench SHALL have trench cover against threats on the parapet side
and SHALL be hidden from them while crouched or prone; he SHALL have no
trench cover against threats behind him. Cover slots SHALL lie every 1.2 m
along the fire step, facing the parapet. Movement along the floor SHALL be
at the trench-floor speed, and men SHALL leave and enter a trench anywhere
along it. A communication trench SHALL give the same cover from both sides
and SHALL have no slots. The test map's trench lines SHALL be built by the
same rules.

#### Scenario: Fire step protects forward
- **WHEN** a man crouches on the fire step of a north-facing trench and an enemy fires from the north
- **THEN** he has trench cover and the enemy cannot see him

#### Scenario: No protection from behind
- **WHEN** the same man is fired at from the south, behind the trench
- **THEN** he has no trench cover from that shot

#### Scenario: Slots along a long trench
- **WHEN** a section is ordered to defend at a 60 m fire trench
- **THEN** its men take slots on the fire step, facing the parapet

#### Scenario: Dug into the ground
- **WHEN** a man stands on a trench floor
- **THEN** he is drawn below the surrounding ground, and the parapet stands above it

### Requirement: Bridges clear of the ground

A bridge's deck SHALL meet each bank at that bank's ground height with a
short ramp and SHALL stand above the ground and the water along its whole
length; no ground or water SHALL be drawn through the deck or its rails.
Men SHALL walk onto the deck from either bank without a step.

#### Scenario: Deck over a high bank
- **WHEN** a bridge spans a river whose banks are 1.5 m above the water level
- **THEN** the deck is drawn without ground showing through it, and men cross it from bank to bank

### Requirement: Smooth map edges

Rivers SHALL be drawn along smoothed curves of their centrelines, and the
edges of water SHALL follow a traced outline, not 1 m cell steps. Borders
between painted ground materials SHALL be broken by a fixed dither so long
straight staircases do not show, while the ground stays pixel art.
Geometry edges SHALL be antialiased by default; an options toggle "Smooth
edges" (PT-BR "Suavizar bordas") SHALL turn it off and SHALL be remembered.
None of this SHALL change the simulation.

#### Scenario: Diagonal river bank
- **WHEN** a river drawn at 30° to the grid is seen at tactical zoom
- **THEN** its bank follows a smooth line and shows no regular 1 m staircase

#### Scenario: Turn smoothing off
- **WHEN** the player turns "Smooth edges" off and reloads the game
- **THEN** the battle renders without geometry antialiasing and the option is still off

### Requirement: Map document version 2

Map documents SHALL carry a format version. Version 2 SHALL hold trench
lines and SHALL drop the road camber. A version 1 document SHALL load: each
trench object SHALL become a 12 m straight fire trench at its place, facing
the side the object faced, and road cambers SHALL be ignored. Saving SHALL
always write version 2.

#### Scenario: Old file opens
- **WHEN** the author imports a version 1 document with two trench objects
- **THEN** the map holds two 12 m fire trenches facing as the objects did, and exporting writes version 2

### Requirement: Deployment areas

Every battle map SHALL define a deployment area for each side: a polygon
that holds that side's section points, does not overlap the other side's
area, and is at least half walkable. Hand-written maps SHALL carry their
areas in their data; an authored document without areas SHALL get, on load,
a default area around each side's points (their bounding box grown by 30 m
and clipped to the map and to its own half). The content check SHALL verify
the areas of every map.

#### Scenario: Old document gets areas
- **WHEN** a map document without deployment areas is loaded
- **THEN** each side has a default area holding its three section points, and the two areas do not overlap

#### Scenario: Content check
- **WHEN** a hand-written map's column area is edited to overlap the legalist area
- **THEN** `pnpm check:content` fails naming the map

### Requirement: Time of day

Every map document SHALL carry a time of day, from early morning to late
afternoon, and a sun direction (the compass bearing the sun shines from,
measured from the map's true north).
The battle view SHALL light the map with them: the sun's height follows the
time of day (low in the morning and late afternoon, high at midday), the
light warms toward the ends of the day, and the sun shines from the
bearing. Maps without the fields SHALL light as midday from the north-east.
The time of day SHALL change only the picture: the simulation, line of
sight and the state hash SHALL NOT depend on it.

#### Scenario: Low sun models the hills
- **WHEN** a map is set to late afternoon with the sun from the west
- **THEN** in battle the west faces of its hills are lit and the east faces darker, more than at midday

#### Scenario: The hash ignores the time of day
- **WHEN** the same battle is run on a map set to morning and then to late afternoon
- **THEN** both runs give the same state hash

#### Scenario: Sun follows north
- **WHEN** a map with the sun from the north (bearing 0) has its north turned to 90
- **THEN** the sun shines from the grid's right edge

### Requirement: Performance budget on the test map

With the default rosters, the 3 vs 3 SHALL run under 3 ms per tick on the
test map in the headless bench, garrisons included, and the view SHALL hold
30 frames per second at strategic zoom on the reference machine.

#### Scenario: Test map within budget
- **WHEN** the bench runs 3,000 ticks of the 3 vs 3 on the test map
- **THEN** the mean tick time is under 3 ms

### Requirement: Terrain shading, water and sun

The heightfield ground SHALL be shaded without banding or faceted stripes on
slopes: smooth normals, a toon ramp with soft steps on slopes, and a sun
from the map's time of day that models hills. Shallow water (fords) SHALL
read as a gravel bar with stones and lighter, rippling water; deep water
darker and calm; banks with gravel and reeds.

#### Scenario: Ford reads as a ford
- **WHEN** the test map's ford is seen from strategic zoom
- **THEN** it is clearly lighter and stonier than the deep water around it

### Requirement: Cover along attack axes

Every skirmish map and the test map SHALL offer cover along each attack
axis between the deployment areas: no straight stretch longer than 60 m on
an axis SHALL be without a cover slot within 10 m of it. The map review
tool SHALL check it and report it to the author; the editor's map check
SHALL show it as a warning, not an error.

#### Scenario: Test map is not open
- **WHEN** the map review tool measures the test map's attack axes
- **THEN** no gap longer than 60 m between cover slots is reported

### Requirement: Map choice from authored maps

The game SHALL offer the 3 vs 3 only on authored maps: the saved skirmish
maps on the start menu and in the sandbox panel, and in development builds
the test map too. With no skirmish map saved, the start menu SHALL say so
and point to the editor instead of offering a battle. Map names and
one-line descriptions SHALL be localized in PT-BR and EN, from the map
documents. A 3 vs 3 started without a map choice (tests, tools, the
sandbox's default) SHALL run on the test map.

#### Scenario: Choose a map
- **WHEN** the player picks a saved skirmish map on the start menu and starts the 3 vs 3
- **THEN** the battle starts on that map with every soldier in its deployment areas

#### Scenario: No maps yet
- **WHEN** the published game has no skirmish map saved
- **THEN** the start menu shows "Nenhum mapa ainda — abra o editor" / "No maps yet — open the editor" and no deploy action

#### Scenario: Default is the test map
- **WHEN** the 3 vs 3 starts without a map choice
- **THEN** it runs on the test map

#### Scenario: Localized names
- **WHEN** the locale is PT-BR or EN
- **THEN** each map's name and description shows in that language

### Requirement: Enemy presets in the map document

A map document SHALL be able to carry the legalist forces one of which is
drawn when the player brings a roster (pre-battle-roster's map presets);
without them the enemy fields the default roster. The map check SHALL refuse
a preset that is not a valid legalist roster, and SHALL check that every
section type deploys in every slot of both sides.

#### Scenario: The test map's presets
- **WHEN** the player brings a roster to the test map and leaves the enemy to chance
- **THEN** the enemy fields one of the test map's three presets, the same one for the same seed

### Requirement: Map north

Every map document SHALL be able to carry the direction of true north on
its grid, as a bearing in degrees clockwise from the grid's top edge.
Maps without it SHALL treat the top edge as north. The value SHALL be
normalised to the range 0 to below 360 on load, a non-numeric value SHALL
make the document invalid, and the document format SHALL move to version 7
so older builds refuse such maps. North SHALL change only the picture and
the HUD: the simulation, line of sight and the state hash SHALL NOT depend
on it. No player-facing text is added by the field itself.

#### Scenario: Read back
- **WHEN** a map with north 30 is saved and loaded again
- **THEN** its north is 30

#### Scenario: Default
- **WHEN** a version 6 map document is loaded
- **THEN** it is upgraded to version 7 with north 0

#### Scenario: Invalid
- **WHEN** a document's north is a string
- **THEN** it is rejected as invalid naming `north`
