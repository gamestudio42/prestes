## MODIFIED Requirements

### Requirement: Rush length

In an attack by bounds, and in an advance while the section is still more
than 40 m from its slots, each rush of the moving team SHALL take a soldier to
cover up to 30 m ahead toward the objective when such cover is reachable, and
otherwise 12 to 20 m across the open (3 to 5 s at a run), never past the
objective. Cover qualifies only inside a 45-degree cone either side of the line
from the soldier to the objective and only when it brings him at least half a
rush (6 m) nearer the objective; a soldier never rushes sideways to cover. The
covering team SHALL hold until the rush ends. The rush length is a game
abstraction of infantry fire-and-movement practice.

#### Scenario: Rush across the open

- **WHEN** a section attacks by bounds across open ground toward an enemy 80 m
  away with no cover in between
- **THEN** each rush moves its team between 12 and 20 m

#### Scenario: Rush to cover

- **WHEN** a wall lies 25 m ahead on the way to the objective
- **THEN** the rushing soldiers make for the wall in one rush

#### Scenario: Last rush stops at the objective

- **WHEN** the objective is 8 m away
- **THEN** the rush ends at the objective, not past it

#### Scenario: No sideways rush

- **WHEN** the only cover in reach lies 25 m to the side and 2 m nearer the
  objective
- **THEN** the soldier rushes straight toward the objective instead
