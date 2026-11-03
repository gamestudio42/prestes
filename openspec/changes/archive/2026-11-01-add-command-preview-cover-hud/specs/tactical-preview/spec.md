## Purpose

Defines the pre-commit tactical preview that lets the player inspect paths,
destination slots, cover positions and facing cones before issuing an order.

## ADDED Requirements

### Requirement: Preview is opt-in

The preview overlay SHALL be hidden by default. A visible HUD control SHALL
enable and disable it, and disabling it SHALL remove ghost soldiers, planned
paths and preview cones without cancelling the pending order.

#### Scenario: Preview starts off
- **WHEN** the game or a boot-camp chapter starts
- **THEN** no ghost soldier, planned path or preview cone is visible

#### Scenario: Enable preview
- **WHEN** the player activates the Preview control
- **THEN** hover previews become visible until the control is deactivated

#### Scenario: Disable preview
- **WHEN** the player deactivates Preview while an order is pending
- **THEN** the preview overlay disappears and the order remains pending

### Requirement: Hover preview before commitment

While an order is pending, hovering a valid ground point or unit SHALL show the
planned movement paths, soldier destinations and cover positions before the
player confirms.

#### Scenario: Ground order preview
- **WHEN** the player selects a ground order and hovers over a valid point
- **THEN** the preview shows each selected soldier's path and destination slot

#### Scenario: Target order preview
- **WHEN** the player selects an attack, suppress, flank, pursue or rescue order
  and hovers a valid target
- **THEN** the preview shows the committed soldiers, facing cone and relevant
  approach or cover position

#### Scenario: Preview updates with the pointer
- **WHEN** the pointer moves to another valid point or unit
- **THEN** the preview clears the previous plan and draws the new plan

#### Scenario: Invalid point
- **WHEN** the pointer is over an invalid or blocked point
- **THEN** no preview is drawn and the order cannot be committed there

### Requirement: Cover-first preview

The preview SHALL show the same cover-first destinations the simulation will use,
including soldiers entering cover before reaching the formation's ideal slot.

#### Scenario: Cover available
- **WHEN** a reachable cover position is available near the pending destination
- **THEN** the preview path ends at that cover and the cone faces the threat side

#### Scenario: No cover available
- **WHEN** no reachable cover position exists
- **THEN** the preview falls back to the formation slot

### Requirement: Preview is non-authoritative

The preview SHALL be computed from the current frame and pending command without
mutating simulation state, orders, health, cover or RNG.

#### Scenario: Hover does not change the hash
- **WHEN** the pointer moves across several preview positions without confirming
- **THEN** the simulation hash remains unchanged

#### Scenario: Preview matches committed plan
- **WHEN** the player commits the previewed order at the same point
- **THEN** the simulation uses the same destination plan shown by the preview

### Requirement: Visual facing cone

The view SHALL draw a translucent cone for a soldier's facing/covered arc,
separate from the selection ring and the casualty marker.

#### Scenario: Cone follows facing
- **WHEN** a soldier changes facing or takes cover
- **THEN** the cone rotates with the facing direction

#### Scenario: Preview cone
- **WHEN** a target order is pending
- **THEN** the preview shows the intended facing cone before commitment

