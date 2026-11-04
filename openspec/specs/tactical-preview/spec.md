# tactical-preview Specification

## Purpose
Defines the opt-in pre-commit preview of paths, destinations, cover and facing cones.

## Requirements

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

The preview SHALL show the same cover slots the simulation will assign,
including soldiers entering cover before reaching the formation's ideal slot, and
SHALL mark which slots are free. Defend previews SHALL clamp every destination to
the same 8 m region as the simulation.

#### Scenario: Cover available

- **WHEN** free reachable cover slots are available near the pending destination
- **THEN** the preview path of each soldier ends at its slot and the cone faces
  the threat side

#### Scenario: No cover available

- **WHEN** no free reachable cover slot exists
- **THEN** the preview falls back to the formation slot

#### Scenario: Defend stays inside the region

- **WHEN** a defend order is previewed near the region edge
- **THEN** every previewed destination stays within 8 m of the picked point

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

The view SHALL draw a translucent cone for a soldier's facing/covered arc, using
the gameplay cone angle, separate from the selection ring and the casualty marker.

#### Scenario: Cone follows facing

- **WHEN** a soldier changes facing or takes cover
- **THEN** the cone rotates with the facing direction

#### Scenario: Preview cone

- **WHEN** a target order is pending
- **THEN** the preview shows the intended facing cone before commitment

### Requirement: Preview cone matches gameplay vision

The preview cone SHALL use the same 65-degree forward cone and facing rule as the
simulation, and SHALL rotate from the previewed destination toward the selected
threat.

#### Scenario: Preview cone points at the threat

- **WHEN** a target or ground order is previewed with a known threat
- **THEN** the cone points from the planned destination toward that threat

#### Scenario: Preview cone uses gameplay angle

- **WHEN** the preview draws a cone
- **THEN** its full angle equals the simulation's 65-degree vision cone

### Requirement: Defend preview keeps the ordered side

A defend preview SHALL use the threat axis for its formation, reject cover on the
far side of a blocking cover, reserve distinct cover destinations and point each
preview cone at the threat.

#### Scenario: Preview behind a wall

- **WHEN** the player previews a defend order on the near side of a wall
- **THEN** every ghost destination stays on that side and the cones face the threat

#### Scenario: Preview matches committed side

- **WHEN** the player commits the previewed defend order
- **THEN** the simulation uses the same side and formation axis

### Requirement: Facing drag

With a ground order armed, pressing on the destination and dragging more than
8 px SHALL set the order's facing from the press point toward the cursor;
releasing SHALL send the order with that facing. While dragging, the preview
SHALL show the rotated formation slots, their facing cones and an arrow from
the destination in the facing direction. Holding Shift SHALL keep the line
spread drag instead. A click without dragging SHALL send the order without
facing.

#### Scenario: Drag to face
- **WHEN** the player arms Move, presses on a point and drags to the north
- **THEN** the preview shows the section's formation around the point facing
  north with an arrow, and releasing moves the section there facing north

#### Scenario: Shift keeps the line
- **WHEN** the player drags with Move armed while holding Shift
- **THEN** the soldiers are spread along the dragged line as before

### Requirement: Drag sets the spacing

The length of a facing drag SHALL set the order's spacing: the drag starts in
close order (1.5 m between soldiers) and opens linearly to 6 m at 20 m of drag
on the ground. A click without dragging keeps the default 2.8 m. While dragging, the preview
SHALL show the slots at that spacing and the spacing in metres beside the
cursor.

#### Scenario: Short drag closes the order
- **WHEN** the player drags 2 m from the destination
- **THEN** the order carries the facing and about 2 m between soldiers

#### Scenario: Long drag opens the order
- **WHEN** the player drags 20 m from the destination
- **THEN** the preview shows the soldiers 6 m apart and the order carries 6 m
