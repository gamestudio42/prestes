## ADDED Requirements

### Requirement: Barbed-wire fences

A barbed-wire fence SHALL be crossable: it SHALL slow a soldier's movement but
SHALL NOT stop his path. Crossing one SHALL cost a small, fixed amount of
health once per crossing, never below 1 health, and the loss SHALL be
deterministic. A wire fence SHALL NOT block sight and SHALL NOT stop fire, and
it SHALL give no cover.

#### Scenario: Crossing a wire fence
- **WHEN** a section is ordered across a barbed-wire fence
- **THEN** the soldiers cross it, each losing the same small amount of health once, and continue

#### Scenario: Fire through the wire
- **WHEN** a soldier has an enemy in range and line beyond a barbed-wire fence
- **THEN** he sees and fires on him, and the wire gives cover to neither man

#### Scenario: One loss per crossing
- **WHEN** a soldier crosses a stretch of wire once
- **THEN** he loses the health once, not on every tick of the crossing

#### Scenario: Never fatal
- **WHEN** a soldier at 1 health crosses a wire fence
- **THEN** he stays at 1 health, alive
