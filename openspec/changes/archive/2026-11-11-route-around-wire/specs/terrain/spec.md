## MODIFIED Requirements

### Requirement: Barbed-wire fences

A barbed-wire fence SHALL be crossable: it SHALL slow a soldier's movement but
SHALL NOT stop his path. Crossing one SHALL cost a small, fixed amount of
health once per crossing, never below 1 health, and the loss SHALL be
deterministic. A wire fence SHALL NOT block sight and SHALL NOT stop fire, and
it SHALL give no cover.

A soldier's route SHALL weigh each wire crossing as a fixed detour, starting
at 25 m: when a gap in the wire or the end of the fence gives a way around
that is at most that much longer than the way across, the route SHALL go
around and the soldier SHALL NOT touch the wire; when the way around is
longer, the route SHALL cross. A route SHALL NOT cross wire at a place where
the way it chose goes around it. The choice SHALL be deterministic and SHALL
be the same in the order preview as in the move.

#### Scenario: Crossing a wire fence
- **WHEN** a section is ordered across a barbed-wire fence with no way around it within the detour
- **THEN** the soldiers cross it, each losing the same small amount of health once, and continue

#### Scenario: A near gap is taken
- **WHEN** a section is ordered across a wire fence that has a gap a few metres to the side of its way
- **THEN** the soldiers go through the gap, none touches the wire and none loses health to it

#### Scenario: A far gap is not taken
- **WHEN** a section is ordered across a wire fence whose only gap would add far more than the detour to its way
- **THEN** the soldiers cross the wire, each losing the crossing's health once, and do not walk to the gap

#### Scenario: Fire through the wire
- **WHEN** a soldier has an enemy in range and line beyond a barbed-wire fence
- **THEN** he sees and fires on him, and the wire gives cover to neither man

#### Scenario: One loss per crossing
- **WHEN** a soldier crosses a stretch of wire once
- **THEN** he loses the health once, not on every tick of the crossing

#### Scenario: Never fatal
- **WHEN** a soldier at 1 health crosses a wire fence
- **THEN** he stays at 1 health, alive
