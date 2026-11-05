## ADDED Requirements

### Requirement: Preview cost

The order preview SHALL draw targeted orders (attack, flank, pursue, rescue)
as straight approach guides from each soldier to his section's approach point
(the target, or for a flank the section's flank point), without a route
search: these orders move by rushes and find their way as they go. The preview SHALL be recomputed only when the pointer moves
to another 1 m cell, the hovered unit, the selection, the order, the facing or
the spacing changes, not on every frame. With three sections of 11 selected,
computing one preview of any order SHALL take under 2 ms on the reference
machine, checked by a test.

#### Scenario: Attack preview of three sections

- **WHEN** three sections are selected with Attack armed and the pointer is on
  an enemy 170 m away
- **THEN** one preview takes under 2 ms and draws a straight guide per soldier
  toward his section's approach point

#### Scenario: Still pointer

- **WHEN** the pointer rests on the same cell while the battle runs
- **THEN** the preview is not recomputed
