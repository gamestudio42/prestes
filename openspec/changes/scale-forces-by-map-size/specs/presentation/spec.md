## MODIFIED Requirements

### Requirement: Section cards

The panel SHALL show a card for each player section with the section type's
thumbnail, section name, alive count and compact health, ammunition and
morale bars. The thumbnail SHALL be the one the roster builder shows for
that section type and SHALL carry the type's localized name as its text
alternative. When the cards do not fit the panel (a medium map's twelve
sections, a large map's sixteen, or sections that arrived by event), they
SHALL keep their size and scroll inside the panel, which SHALL not grow over
the map beyond its own area (the owner's choice, 2026-11-17).

#### Scenario: Section card status

- **WHEN** combat changes a section's health, ammunition or morale
- **THEN** its card bars and values update from the frame

#### Scenario: Card shows the section's thumbnail

- **WHEN** a battle starts with a machine-gun section in the player's force
- **THEN** its card shows the machine-gun section's thumbnail, not a placeholder

#### Scenario: Placeholder portrait is named

- **WHEN** the asset register is inspected
- **THEN** the section thumbnails are listed as built from the soldier kit, and no section portrait is listed as a placeholder

#### Scenario: Twelve cards scroll

- **WHEN** a battle starts with twelve player sections at 1280 x 720
- **THEN** the cards keep their size, the last ones are reached by scrolling inside the panel, and the panel keeps its size
