## ADDED Requirements

### Requirement: Move preview draws the searched route

While a move order is pending, the preview SHALL draw for each selected
soldier the route the move would give him: his section's searched route from
its centre to the pointer, at his place in the body, with its waypoints,
ending at his destination; a soldier whose shifted route would hit cover or
cross wire SHALL be drawn on the route he would search for himself, as the
move does. The preview SHALL NOT draw a straight line through a building, a
wall or a wire fence the move would go around, and SHALL draw the crossing
where the move would cross. The same route SHALL be what the soldiers walk
when the order is given at that point.

#### Scenario: Move preview goes through the near gap
- **WHEN** a section is selected with Move armed and the pointer is beyond a wire fence that has a gap a few metres to the side
- **THEN** the drawn routes bend through the gap and none crosses the wire

#### Scenario: Move preview crosses where the move crosses
- **WHEN** the pointer is beyond a wire fence whose only gap is far
- **THEN** the drawn routes cross the wire, and the soldiers ordered there cross it at the drawn place

#### Scenario: Move preview bends round a building
- **WHEN** the pointer is beyond a building in the section's way
- **THEN** the drawn routes bend around the building footprint with their waypoints

## MODIFIED Requirements

### Requirement: Preview cost

The order preview SHALL draw targeted orders (attack, flank, pursue, rescue)
as straight approach guides from each soldier to his section's approach point
(the target, or for a flank the section's flank point), without a route
search: these orders move by rushes and find their way as they go. A move
preview SHALL search one route per selected section and SHALL search for a
single soldier only where his shifted route is blocked. The preview SHALL be
recomputed only when the pointer moves to another 1 m cell, the hovered unit,
the selection, the order, the facing or the spacing changes, not on every
frame. With three sections of 11 selected, computing one preview of any order
SHALL take under 2 ms on the reference machine over open ground, and a move
preview past a wire fence with a gap on a 400 m map SHALL take under 6 ms,
both checked by a test.

#### Scenario: Attack preview of three sections

- **WHEN** three sections are selected with Attack armed and the pointer is on
  an enemy 170 m away
- **THEN** one preview takes under 2 ms and draws a straight guide per soldier
  toward his section's approach point

#### Scenario: Move preview past a fence

- **WHEN** three sections are selected with Move armed on a 400 m map and the
  pointer is beyond a wire fence with a gap
- **THEN** one preview takes under 6 ms and draws each soldier's searched route

#### Scenario: Still pointer

- **WHEN** the pointer rests on the same cell while the battle runs
- **THEN** the preview is not recomputed
