## ADDED Requirements

### Requirement: Heightfield rendering

The scene SHALL render a low-poly heightfield generated from the shared sandbox
terrain. Characters, movement paths, markers and tracers SHALL be placed at the
terrain height.

#### Scenario: Units follow the ridge

- **WHEN** a unit crosses the ridge
- **THEN** its rendered model rises and falls with the terrain

#### Scenario: Ground picking uses terrain

- **WHEN** the player right-clicks on a slope
- **THEN** the move destination is the terrain point under the cursor, not the flat plane

#### Scenario: Paths follow height

- **WHEN** a path crosses the ridge
- **THEN** its dashes and markers follow the terrain height
