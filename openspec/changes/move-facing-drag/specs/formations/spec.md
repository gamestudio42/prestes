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

### Requirement: Ordered spacing

A ground order SHALL accept an optional spacing between soldiers, from 2.8 m
(the default) to 6 m. With a spacing, the formation slots SHALL use it, and the
section SHALL keep it for formation changes and bounding until an order without
spacing returns it to the default. A spacing that is not a finite number SHALL
be rejected with `invalid_position`; finite values SHALL be clamped to the
range.

#### Scenario: Open order
- **WHEN** a section in line is ordered to a point with a spacing of 5 m
- **THEN** neighbouring soldiers stand about 5 m apart on arrival

#### Scenario: Spacing kept while bounding
- **WHEN** a section with a 5 m spacing advances by bounds
- **THEN** both teams take slots 5 m apart

#### Scenario: Back to default
- **WHEN** a later move carries no spacing
- **THEN** the section returns to 2.8 m

