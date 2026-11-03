## ADDED Requirements

### Requirement: Blocking obstacles

Cover volumes marked as movement blockers SHALL block unit movement and pathfinding.
High cover SHALL also block line of sight. The central house SHALL not remain as an
invisible obstacle.

#### Scenario: Unit cannot walk through a wall
- **WHEN** a unit is ordered across a stone wall
- **THEN** its path goes around the wall

#### Scenario: High wall blocks fire
- **WHEN** a stone wall lies between shooter and target
- **THEN** the shooter does not acquire the target

### Requirement: Cover-aware flank split

A Flank command SHALL divide the selected troop into two halves: one suppresses
the target and holds, the other flanks. Flank positions SHALL prefer cover against
the target.

#### Scenario: Half suppresses
- **WHEN** a six-person troop flanks
- **THEN** three units suppress and three receive flank routes

#### Scenario: Covered flank
- **WHEN** a flank candidate has cover against the target
- **THEN** it is preferred over an exposed candidate

### Requirement: Defensive withdrawal

Withdraw and suppression fallback SHALL prefer defensible high-cover positions
away from the nearest enemy, falling back to a direct retreat when none is reachable.

#### Scenario: Withdraw to cover
- **WHEN** a unit withdraws and a high-cover position away from the enemy is reachable
- **THEN** it moves there

#### Scenario: Direct fallback
- **WHEN** no cover route is reachable
- **THEN** the unit retreats directly away from the enemy
