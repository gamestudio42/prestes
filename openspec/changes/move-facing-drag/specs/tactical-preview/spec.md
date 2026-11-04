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

