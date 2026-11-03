## ADDED Requirements

### Requirement: Terrain-aware movement

The simulation SHALL multiply each unit's movement step by the terrain speed
factor at its current position. Terrain SHALL NOT break pathfinding, panic routing
or the map bounds.

#### Scenario: Rough ground slows a unit

- **WHEN** a unit moves across a ridge or trench
- **THEN** it covers less distance per tick than on flat ground

#### Scenario: Terrain does not remove movement

- **WHEN** a unit has a valid path across terrain
- **THEN** it eventually reaches the destination

### Requirement: Terrain-aware cover

Hit chance and suppression SHALL use terrain cover in addition to sandbag and
stance cover. Terrain cover SHALL not stack with sandbag cover.

#### Scenario: Ridge protects the reverse slope

- **WHEN** the ridge lies between a unit and the shooter
- **THEN** the unit receives terrain cover

#### Scenario: Trench protects its occupant

- **WHEN** a unit is inside the trench
- **THEN** incoming fire uses the trench cover value
