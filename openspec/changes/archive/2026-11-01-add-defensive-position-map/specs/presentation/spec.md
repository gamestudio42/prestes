## ADDED Requirements

### Requirement: Selection feedback

The view SHALL draw a blue rectangle for a leftward drag and a green rectangle for a
rightward drag. The HUD SHALL show how many player units are selected.

#### Scenario: Blue box
- **WHEN** the player drags leftward
- **THEN** a blue selection rectangle appears

#### Scenario: Green box
- **WHEN** the player drags rightward
- **THEN** a green selection rectangle appears

### Requirement: Context cursor hints

Hovering a valid defensive ground point SHALL show a shield icon; hovering a living
enemy SHALL show a target icon. Hints SHALL not issue commands.

#### Scenario: Shield hint
- **WHEN** the cursor is over ground with cover against a legalist
- **THEN** a shield hint is shown

#### Scenario: Target hint
- **WHEN** the cursor is over a living enemy
- **THEN** a target hint is shown

### Requirement: Obstacle rendering

Walls, barrels, low walls, sandbags and the trench SHALL be rendered from the
simulation cover list, and the central house SHALL be absent.

#### Scenario: Mixed cover is visible
- **WHEN** the sandbox loads
- **THEN** walls, barrels, low walls, sandbags and the trench are visible

#### Scenario: House removed
- **WHEN** the sandbox loads
- **THEN** no central house mesh is rendered
