## ADDED Requirements

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
