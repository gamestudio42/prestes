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
