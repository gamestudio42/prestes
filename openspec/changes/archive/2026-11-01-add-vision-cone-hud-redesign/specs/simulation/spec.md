## ADDED Requirements

### Requirement: Forward vision cone

A unit SHALL see a target only when the target is within weapon range, inside a
65-degree forward vision cone and not blocked by sight-blocking cover. Target
acquisition, suppression targeting and fire SHALL use the same visibility rule.

#### Scenario: Target in front

- **WHEN** a target stands inside the unit's forward cone with clear line of sight
- **THEN** the unit can acquire and fire at that target

#### Scenario: Target behind

- **WHEN** a target stands behind the unit and outside the forward cone
- **THEN** the unit does not acquire or fire at that target while keeping its
  facing

#### Scenario: Cover interrupts the cone

- **WHEN** sight-blocking cover lies between the unit and an otherwise visible
  target
- **THEN** the unit does not acquire or fire at that target

#### Scenario: Explicit attack turns the soldier

- **WHEN** the player issues an attack, suppress, flank or pursue order
- **THEN** the ordered units face the chosen target

## MODIFIED Requirements

### Requirement: Facing direction

Every unit SHALL expose a facing direction. A unit with a target SHALL face the
target; otherwise it SHALL face its current movement path; otherwise it SHALL keep
its last facing. An explicit attack order SHALL turn the soldier toward the target.

#### Scenario: Face the target

- **WHEN** a unit has a visible target
- **THEN** its facing vector points toward that target

#### Scenario: Face movement

- **WHEN** a unit moves without a target
- **THEN** its facing vector points along its path

#### Scenario: Keep idle facing

- **WHEN** a unit has no target and no movement path
- **THEN** its facing vector remains at its last value instead of turning to the
  nearest enemy
