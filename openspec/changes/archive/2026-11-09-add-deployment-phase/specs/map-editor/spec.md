## MODIFIED Requirements

### Requirement: Gameplay layers

The editor SHALL place both sides' deployment zones (three section points,
a facing and a deployment area polygon per side, named column and legalist)
and SHALL show them labelled. A new map SHALL start with a default area
around each side's points; the author SHALL move, insert and delete the
area's corners. The map check SHALL report as errors a section point outside
its side's area, areas that overlap, and an area with less than half its
surface walkable. When the map objectives capability is present, the editor
SHALL also place objectives with their area, flag point, value, initial
owner and localized name. Labels SHALL be localized in EN and PT-BR.

#### Scenario: Move a deployment point
- **WHEN** the author drags the column's second section point
- **THEN** the map document stores the new point and the playtest starts that section there

#### Scenario: Shape a deployment area
- **WHEN** the author drags a corner of the legalist area
- **THEN** the area follows and the playtest's deployment phase refuses positions outside the new shape

#### Scenario: Point outside its area
- **WHEN** a column section point lies outside the column's area and the map is checked
- **THEN** the check reports an error that selects the point when clicked
