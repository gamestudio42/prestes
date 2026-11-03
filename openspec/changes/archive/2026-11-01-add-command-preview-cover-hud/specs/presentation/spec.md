## ADDED Requirements

### Requirement: Reference command HUD

The HUD SHALL follow the reference command layout: top command bar, bottom-left
section cards, centered order controls and right status panel.

#### Scenario: Reference layout
- **WHEN** the game is running at desktop width
- **THEN** the command bar, section cards, order controls, stance controls and
  status panel are visible in their reference groups

### Requirement: Preview control

The command bar SHALL expose a visible Preview toggle. It SHALL be off by
default, change state with a button and show the active state.

#### Scenario: Preview toggle is off by default
- **WHEN** the HUD loads
- **THEN** the Preview control is inactive and no preview overlay is drawn

#### Scenario: Toggle preview
- **WHEN** the player clicks Preview
- **THEN** the control becomes active and hover previews are enabled

### Requirement: Hide and restore HUD

The HUD SHALL provide an explicit control to hide the whole HUD and a visible
restore affordance while hidden.

#### Scenario: Hide HUD
- **WHEN** the player activates Hide HUD
- **THEN** the command bar and all HUD panels disappear while the map remains
  interactive

#### Scenario: Restore HUD
- **WHEN** the player activates the restore control
- **THEN** the HUD returns in the same state

#### Scenario: Keyboard restore
- **WHEN** the HUD is hidden and the player presses the hide-HUD shortcut
- **THEN** the HUD is restored

