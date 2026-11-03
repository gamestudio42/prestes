## ADDED Requirements

### Requirement: Facing direction

Every unit SHALL expose a facing direction. A unit with a target SHALL face the
target; otherwise it SHALL face its current movement path.

#### Scenario: Face the target

- **WHEN** a unit has a visible target
- **THEN** its facing vector points toward that target

#### Scenario: Face movement

- **WHEN** a unit moves without a target
- **THEN** its facing vector points along its path

### Requirement: Pathfinding around obstacles

Move orders SHALL produce a path around the building instead of a straight line
through it.

#### Scenario: Route around the building

- **WHEN** a unit is ordered across the building
- **THEN** its path contains waypoints that avoid the building footprint

#### Scenario: Clear route stays direct

- **WHEN** the straight line to the destination is clear
- **THEN** the path contains only the destination waypoint

### Requirement: Automatic cover seeking

A unit in the open with a visible target SHALL seek a nearby sandbag cover point
that has line of sight to the target, when it is not already moving on a player
order. It SHALL crouch at cover unless the player has explicitly set its stance.

#### Scenario: Seek cover

- **WHEN** a unit is in the open with a target and a reachable sandbag cover point
- **THEN** it moves to the cover position and gains cover

#### Scenario: Player stance wins

- **WHEN** the player explicitly sets a unit's stance
- **THEN** automatic cover does not override that stance

#### Scenario: No cover available

- **WHEN** no cover point has line of sight to the target
- **THEN** the unit keeps fighting from its current position
