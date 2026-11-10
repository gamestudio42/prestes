## ADDED Requirements

### Requirement: Walled yards on authored maps

On an authored map a walled yard SHALL be a position found from its walls,
with no marking by the author. Walls (stone, brick or taipa) 1.5 m or taller
whose ends come within 12 m of one another SHALL form a group; a group whose
walls run along at least 70 % of the outline of the ground they span, of at
least 60 m² and at most 80 m across, SHALL be a yard. A yard SHALL hold up
to 12 men and no more than its ports; its ports SHALL be the wall slots on
the yard side looking out, and its entrances the gaps of 1.5 to 12 m between
wall ends. The editor SHALL show such a yard's facts like any position, and
the map check SHALL report a position whose entrance is not on open ground
or not reachable.

#### Scenario: A yard with a gate
- **WHEN** a map has a 30 × 20 m U of 1.6 m stone wall closed by two short walls with a 10 m gap
- **THEN** it compiles a yard position with one entrance in the gap and every port facing out

#### Scenario: Not a yard
- **WHEN** a map has an L of wall, walls under 1.5 m, or walls round a field 100 m across
- **THEN** no yard position is compiled

#### Scenario: The test map's yard
- **WHEN** the test map is loaded
- **THEN** its walled yard by the column is a position with one entrance
