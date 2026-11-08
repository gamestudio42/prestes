## ADDED Requirements

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
