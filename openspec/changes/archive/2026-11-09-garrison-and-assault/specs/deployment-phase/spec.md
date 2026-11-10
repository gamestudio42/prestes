## MODIFIED Requirements

### Requirement: Orders take effect at once

During the deployment phase a move order SHALL place the section in its
formation at the target with the ordered facing; a defend order SHALL place
each man directly in the cover slot he would take in battle, and a defend
order at or within 10 m of a trench line SHALL fill that trench's fire step
first; stance, facing, formation, spacing and fire control SHALL be set at
once. Orders that belong to the fight (fire at, assault, rush, retreat) and
the garrison orders (enter a position, leave it) SHALL be refused with a
localized reason: nobody starts a battle inside a position, the men go in
once the battle has started.

#### Scenario: Instant move
- **WHEN** the player orders a section to move 60 m forward inside the area
- **THEN** the section stands in formation at the target at once, still at tick 0

#### Scenario: Into the trench
- **WHEN** the player orders a section to defend at a point 5 m behind a fire trench
- **THEN** its men stand at once on the trench's fire step slots, facing the parapet

#### Scenario: Fight orders refused
- **WHEN** the player orders a section to fire at a point during deployment
- **THEN** the order is refused with the reason "Not during deployment" / "Não durante o desdobramento"

#### Scenario: No entering during deployment
- **WHEN** the player gives a section the Ocupar order on a house during deployment
- **THEN** the order is refused with the reason "Not during deployment" / "Não durante o desdobramento" and the men stay where they were placed
