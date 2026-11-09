# battle-maps Specification

## Purpose
Defines the battle maps the 3 vs 3 is fought on: the catalog of hand-written and
authored maps, the map documents the editor saves, their sizes and the proof
map that shows the document pipeline carries a real battlefield.

## Requirements

### Requirement: Authored map documents

A battle map SHALL be loadable from a versioned map document (the editor's
file format) as well as from a hand-written definition. Compiling a document
SHALL be a pure, deterministic step: the same document SHALL give the same
battle map, bit for bit, in the simulation and the view threads. A compiled
document SHALL obey every rule a hand-written map obeys (setting label,
source note, deployment checks, localized name and description).

#### Scenario: Deterministic compile
- **WHEN** the same map document is compiled twice and the same 3v3 runs 1,000 ticks on each
- **THEN** both runs end with the same state hash

#### Scenario: Same data in both threads
- **WHEN** the simulation and the view load the same authored map
- **THEN** height, surface, water and cover sampled at the same position agree

#### Scenario: Hand-written maps unchanged
- **WHEN** the determinism check runs after this change
- **THEN** the Vila Militar, Fazenda, Serra e Rio and Bairro goldens are unchanged

### Requirement: Authored maps in the catalog

Map documents in the project's authored maps folder SHALL be registered in
the map catalog at build time and SHALL be offered on the skirmish page like
the hand-written maps. The content check SHALL compile and validate every
authored map and SHALL fail the check on any error.

#### Scenario: Authored map on the menu
- **WHEN** a valid `forte.map.json` is in the authored maps folder and the game is built
- **THEN** the skirmish page lists the map with its localized name

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

### Requirement: Proof authored map

The project SHALL ship one authored map that re-creates the Fazenda as a map
document, to prove the document pipeline. It SHALL play with the same
features as the hand-written Fazenda (roads, ditches, crops, buildings,
trenches, deployment) and SHALL pass the map checks. The hand-written Fazenda
SHALL stay the one the menu offers until the author chooses otherwise.

#### Scenario: Proof map plays
- **WHEN** the battle report runs on the proof map
- **THEN** the battle ends with an outcome within the report's time band and no validation error

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

### Requirement: Map catalog and choice

The game SHALL offer the 3v3 on the Vila Militar field (the current map, the
default), Fazenda, Serra e Rio and Bairro. The player SHALL choose the map on
the start menu before the 3v3 starts and in the sandbox panel. Map names and
one-line descriptions SHALL be localized in PT-BR and EN, through the locale
catalog. The default map SHALL keep its current terrain, covers and
determinism golden.

#### Scenario: Choose a map
- **WHEN** the player picks Serra e Rio on the start menu and starts the 3v3
- **THEN** the battle starts on Serra e Rio with all 66 soldiers in its deployment zones

#### Scenario: Default unchanged
- **WHEN** the 3v3 starts without a map choice
- **THEN** it runs on the Vila Militar field and its golden hash is unchanged

#### Scenario: Localized names
- **WHEN** the locale is PT-BR or EN
- **THEN** each map's name and description shows in that language

### Requirement: Map bounds and pathfinding

Each map SHALL define its own bounds. Movement orders, pathfinding and
spawning SHALL use the active map's bounds and walkable area, so that a
soldier can reach any walkable point of a map up to 400 × 400 m. Points
outside the bounds, in deep water or inside buildings SHALL NOT be order
targets.

#### Scenario: Far corner reachable
- **WHEN** a section is ordered to a walkable point near a corner of Fazenda
- **THEN** it finds a path and arrives there

#### Scenario: Order into deep water
- **WHEN** the player orders a section to a point in the river away from any crossing
- **THEN** the order is refused or moved to the nearest walkable bank

### Requirement: Fazenda map

Fazenda SHALL be a 400 × 400 m rural map set on a coffee and sugarcane
fazenda of the São Paulo and Paraná interior, 1924–1925 (historical
setting, fictional place). It SHALL have: wide open pasture with fewer than
one cover per 400 m² over most of the map; coffee rows; at least one
cornfield and one canefield, each large enough to hide a section of eleven
(at least 40 × 30 m); a farmhouse (casa-sede), a row of colonist houses, a
sugar mill (engenho) with a chimney, a corral, wire and wooden fences and a
dirt road; gentle rises; and a trench line with sandbagged bays and a
communication trench for each side. Historical note: the 1924–1925 Paraná
front was held from dug-in lines (`macaulay-1974`, ch. III, pp. 71, 82, 85);
coffee and cane farms were typical of the São Paulo interior of the period
(historical note).

#### Scenario: Hidden flank through the cane
- **WHEN** a player section crosses the canefield crouched, out of its edge rows, toward the enemy trench
- **THEN** the enemy side does not see it until it is within the cane's concealment distance or leaves the cane

#### Scenario: Open ground is dangerous
- **WHEN** a section crosses the open pasture standing in sight of an enemy trench within 120 m
- **THEN** the enemy sees it and can fire at it

### Requirement: Serra e Rio map

Serra e Rio SHALL be a 400 × 400 m highland map set in the river country of
Goiás and Minas Gerais crossed by the column in 1925–1926 (historical
setting, fictional place). A river SHALL cross the whole map between the two
deployment zones and SHALL be crossable only at three points: a ford (vau), a
wooden bridge and a cable ferry (balsa). The map SHALL have two hill masses
with slopes that block sight and fire, large patches of tall grass (capim),
cerrado scrub with low twisted trees, buriti palms along the banks and rock
outcrops. Historical note: at the Verdinho Bridge outside Mineiros, Goiás, in June
1925, the rearguard burned the bridge and waded the river, and the pursuers
cut a ford with its timbers (`macaulay-1974`, pp. 122–124); ferries and boats
served the southern crossings (pp. 74, 93).

#### Scenario: Only three crossings
- **WHEN** pathfinding searches from one deployment zone to the other
- **THEN** every path found goes over the ford, the bridge or the ferry

#### Scenario: Hill blocks sight
- **WHEN** a hill crest lies between two soldiers that are otherwise in range and in each other's cone
- **THEN** neither sees the other

### Requirement: Bairro map

Bairro SHALL be a 320 × 320 m urban map set in a working-class and factory
quarter of São Paulo in July 1924 (historical setting, fictional place):
blocks of terraced one- and two-storey houses, a brick factory with a
chimney and a walled yard, a church on a square, cobbled streets with tram
rails, gas lamp posts, a raised rail embankment and barricades of paving
stones and sacks. Streets SHALL give long sight lines along their length;
house blocks SHALL block sight and movement. Historical note: the São Paulo
revolt of July 1924 was a separate front from the column (`macaulay-1974`,
ch. I, pp. 4–6); shells of both sides caused civilian casualties and the
loyalist bombardment from 12 July drove thousands of refugees from the city
(pp. 10, 15). The map's codex note SHALL name the civilian cost; the map SHALL have
no civilians.

#### Scenario: Streets are fire lanes
- **WHEN** a soldier stands at one end of a straight street and an enemy at the other within 120 m
- **THEN** each can see the other along the street

#### Scenario: Blocks break sight
- **WHEN** a house block lies between two soldiers
- **THEN** neither sees the other through it

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
as 1920s Brazil: the Bairro's quintal walls as plastered brick with a coping
and its fences as wooden boards; Fazenda fences as wire on posts; one-storey
houses with a door on the street and tiled roofs; vendas with a wide door
and an awning; the matriz with a façade and a tower; the coreto with a roof
on posts; riverbanks with gravel and reeds. No real building, brand or shop name SHALL be shown.

#### Scenario: Walls read as walls
- **WHEN** the Bairro is seen at tactical zoom
- **THEN** quintal walls are drawn as plastered walls and fences as board fences, not as stone blocks

### Requirement: Roadside ditches

Dirt roads on the battle maps SHALL have drainage ditches (valas) along
their edges where the map says so: channels 0.8 m deep and 1.5 m wide sunk
into the heightfield. A soldier in a ditch SHALL receive trench-like cover
when crouched or prone against a threat outside it, SHALL move at the
trench-floor speed along it, and SHALL be able to take a cover slot in it.
The Fazenda's main road SHALL have a ditch on both sides for its whole
length.

#### Scenario: Cover in the ditch
- **WHEN** a soldier lies prone in the Fazenda road ditch and an enemy fires from the open field
- **THEN** he receives the ditch's cover

#### Scenario: Slots along the ditch
- **WHEN** a section is ordered to defend at the roadside
- **THEN** its men take slots in the ditch

### Requirement: Cover density on attack axes

Every battle map SHALL offer cover along each attack axis between the
deployment zones: no straight stretch longer than 60 m on an axis SHALL be
without a cover slot within 10 m of it. The map review tool SHALL check it.

#### Scenario: Fazenda is no longer open
- **WHEN** the map review tool measures the Fazenda's attack axes
- **THEN** no gap longer than 60 m between cover slots is reported

### Requirement: Terrain shading and water

The heightfield ground SHALL be shaded without banding or faceted stripes on
slopes: smooth normals, a toon ramp with soft steps on slopes, and a sun
angle that models hills. Shallow water (fords) SHALL read as a gravel bar
with stones and lighter, rippling water; deep water darker and calm; banks
with gravel and reeds. On Serra e Rio the capim SHALL grow along the
riverbanks and the veredas, with the buriti palms.

#### Scenario: Ford reads as a ford
- **WHEN** the Serra e Rio ford is seen from strategic zoom
- **THEN** it is clearly lighter and stonier than the deep river around it

#### Scenario: Grass by the river
- **WHEN** the Serra e Rio vegetation is loaded
- **THEN** most capim lies within 30 m of the river's banks

### Requirement: Battle map performance budget

With the default rosters, the 3 vs 3 SHALL run under 3 ms per tick on every
battle map in the headless bench, and the view SHALL hold 30 frames per
second at strategic zoom on the reference machine.

#### Scenario: Bairro within budget
- **WHEN** the bench runs 1,000 ticks of the 3 vs 3 on Bairro
- **THEN** the mean tick time is under 3 ms

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
and SHALL have no slots. The Fazenda's trench lines SHALL be built by the
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
