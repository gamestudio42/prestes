## ADDED Requirements

### Requirement: Cover slot markers

Hovering a cover object SHALL show its slots as small markers, distinguishing
free and taken slots, and the number of free slots. Slot markers SHALL follow the
terrain height and SHALL not be drawn when no cover is hovered and no order is
pending.

#### Scenario: Hover a trench

- **WHEN** the player hovers the training trench
- **THEN** its slots appear with free and taken markers and a free count

#### Scenario: Markers hidden

- **WHEN** no cover is hovered and no order is pending
- **THEN** no slot markers are drawn
