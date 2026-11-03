## ADDED Requirements

### Requirement: Whole-troop sandbox insertion

The sandbox SHALL support inserting a complete 11-soldier enemy troop and a
complete 3-soldier command troop as single troops, in addition to existing
single-element tools. Each insertion SHALL create an independent troop.

#### Scenario: Insert enemy troop

- **WHEN** the player chooses the enemy-troop tool and confirms a valid position
- **THEN** 11 enemy soldiers appear in formation as one troop

#### Scenario: Select inserted troop

- **WHEN** the player clicks any soldier of an inserted troop
- **THEN** the whole troop is selected

### Requirement: Universal placement preview

Every sandbox placement tool SHALL show a preview of the full element before
placement. The preview SHALL follow the pointer, show footprint and direction,
mark valid or invalid placement, rotate with Z/X, confirm with a click and cancel
with Escape or the right mouse button.

#### Scenario: Valid preview

- **WHEN** the pointer is over a free position
- **THEN** the preview is valid and a click places the element

#### Scenario: Invalid preview

- **WHEN** the preview overlaps an obstacle, troop or map boundary
- **THEN** it is invalid and a click does not place the element

#### Scenario: Rotate and cancel

- **WHEN** the player presses Z or X
- **THEN** the preview rotates; pressing Escape or right-click cancels without
  changing the map
