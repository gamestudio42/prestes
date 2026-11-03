## ADDED Requirements

### Requirement: Character yaw

The rendered character SHALL rotate to match the unit's facing direction, so the
rifle points at the target.

#### Scenario: Aim at the enemy

- **WHEN** a unit faces an enemy
- **THEN** the character model and rifle rotate toward it

#### Scenario: Face the route

- **WHEN** a unit moves without a target
- **THEN** the character turns along its path

### Requirement: Path route

The movement path layer SHALL draw the actual waypoint route returned by
pathfinding, not a straight line through the building.

#### Scenario: Detour is visible

- **WHEN** a unit is ordered across the building
- **THEN** the dashed route bends around the building footprint
