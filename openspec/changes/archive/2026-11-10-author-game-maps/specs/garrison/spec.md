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

## MODIFIED Requirements

### Requirement: Enterable positions

Buildings and fortified works on the battle maps SHALL be positions with a
capacity, one or more entrances and firing ports, as data shared by the
simulation and the view. Capacities SHALL follow the building model (one-
storey house 4, venda 5, armazém 6, sobrado 8, casa-sede 8, engenho 8,
church 10, factory 12) and the works (a fire trench line one man per 1.2 m
of its fire step, a communication trench one man per 2 m). The content check SHALL verify that every
entrance is reachable.

#### Scenario: Positions on the Bairro
- **WHEN** the test map (`campo-de-provas`) is loaded
- **THEN** every building and every fire trench on it is a position with its capacity and reachable entrances

### Requirement: Elevated positions

Tall buildings SHALL have elevated ports: the matriz's tower (capacity 2,
eye at 9 m), the upper floor of a sobrado (eye at 4.6 m), the factory's and
the armazéns' upper windows (eye at 5 m) and the casa-sede's and the
engenho's lofts (eye at 4 m). A soldier at an elevated port SHALL see and
fire over low walls, hedges and crops whose top lies below his line of
sight, and SHALL be seen from farther in turn. Roofs SHALL NOT be posts
(user, 2026-11-09): no section stands on a roof. The view SHALL draw a
marker at an occupied tower or upper floor.

#### Scenario: Over the walls from the tower
- **WHEN** a rifleman in the matriz's tower faces a quintal behind a 1.8 m wall
- **THEN** he sees and can fire at a soldier crouched in that quintal

#### Scenario: Over the corn from the loft
- **WHEN** a rifleman in a casa-sede's loft looks across a cornfield
- **THEN** the crop does not cut his line of sight to a standing man beyond it

#### Scenario: At most two in the tower
- **WHEN** a section of 8 enters the matriz with its threat beyond the quintal walls
- **THEN** no more than two of its men take the tower's ports
