## ADDED Requirements

### Requirement: Ordered facing

A ground order (move, advance, recon, defend, ambush, reserve) SHALL accept an
optional facing. With a facing, the section's current formation SHALL be laid
out around the destination rotated to that facing, matched and routed as any
other move, and each soldier SHALL face and aim that way on arrival and keep
it until a new order, a target or a face order changes it. Cover slots SHALL
be scored against the ordered facing when no enemy is known, and defend and
ambush SHALL use it instead of the facing toward the nearest enemy. Without a
facing, orders SHALL behave as before, deterministically.

#### Scenario: Wedge turned east
- **WHEN** a section in wedge is ordered to a point with facing east
- **THEN** its slots form a wedge whose point is the destination and whose
  arms trail to the west, and every soldier faces east on arrival

#### Scenario: Facing kept after arrival
- **WHEN** a section arrives with an ordered facing and no enemy is in sight
- **THEN** its soldiers keep that facing and aim while they hold

#### Scenario: Invalid facing
- **WHEN** a move carries a zero-length facing
- **THEN** the command is rejected with `invalid_position`

#### Scenario: No facing
- **WHEN** the same commands are replayed without facing
- **THEN** the simulation hash equals the golden replay
