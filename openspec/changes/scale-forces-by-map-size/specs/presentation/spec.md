## MODIFIED Requirements

### Requirement: Section cards

The panel SHALL show a card for each player section with the section type's
thumbnail, section name, alive count and compact health, ammunition and
morale bars. The thumbnail SHALL be the one the roster builder shows for
that section type and SHALL carry the type's localized name as its text
alternative. Twelve section cards SHALL be visible at 1280 x 720 without
scrolling and without covering the map beyond the panel's own area; more
cards (sixteen on a large map, or sections that arrived by event) SHALL
scroll inside the panel.

#### Scenario: Section card status

- **WHEN** combat changes a section's health, ammunition or morale
- **THEN** its card bars and values update from the frame

#### Scenario: Card shows the section's thumbnail

- **WHEN** a battle starts with a machine-gun section in the player's force
- **THEN** its card shows the machine-gun section's thumbnail, not a placeholder

#### Scenario: Placeholder portrait is named

- **WHEN** the asset register is inspected
- **THEN** the section thumbnails are listed as built from the soldier kit, and no section portrait is listed as a placeholder

#### Scenario: Twelve cards fit

- **WHEN** a battle starts with twelve player sections at 1280 x 720 in PT-BR
- **THEN** all twelve cards are visible without scrolling

#### Scenario: More cards scroll

- **WHEN** two sections arrive by event to a force of twelve
- **THEN** the panel scrolls to show all fourteen and the map outside the panel stays uncovered
