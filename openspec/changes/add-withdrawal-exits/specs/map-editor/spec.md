## ADDED Requirements

### Requirement: Exits in the editor

The editor SHALL have a tool to draw the column's exits in the gameplay
layers (moving, inserting and deleting corners and moving a whole exit, as
for deployment areas), each with a name in PT-BR and EN, at most four. Exits
SHALL be drawn labelled on the map with the deployment areas. Map properties
SHALL edit the withdrawal requirement: a number of column sections and
whether the command section must be among them; the requirement SHALL be
present exactly while the map has at least one exit (adding the first exit
creates it at 1 section without the command section; deleting the last exit
removes it). The Events panel SHALL offer the "exited" trigger (a number of
sections, or the command section) only while the map has exits. Every change
SHALL be one undoable step, it SHALL be saved, exported and imported with
the map, and the playtest SHALL play it. All labels SHALL be localized in EN
and PT-BR; the author's exit names are not translated.

#### Scenario: Draw an exit
- **WHEN** the author draws an exit on the west edge named "Passo do Uruguai" / "Uruguay crossing" and sets the requirement to 2 sections with the command section
- **THEN** the map shows the labelled exit, the saved map carries the exit and the requirement, and undo removes them step by step

#### Scenario: Last exit deleted
- **WHEN** the author deletes the map's only exit and an event uses the "exited" trigger
- **THEN** the editor asks first, naming the event, and on confirmation the requirement is removed and the event's trigger is left empty and reported by the check

#### Scenario: Old map opens
- **WHEN** the author opens a version 9 map
- **THEN** it opens with no exits and no requirement, and saving writes version 10

### Requirement: Exit checks

The map check SHALL report as errors: an exit with fewer than 3 or more than
16 corners; an exit with no walkable dry ground; an exit not reachable from
the column's deployment area; an exit overlapping the column's deployment
area; an exit name missing in either language; more than four exits; a
requirement of fewer than 1 section or more than the sections the column
fields at the start (the map's fixed column force when it has one, else the
largest roster the player may bring); a requirement naming the command
section when the map's fixed column force has no command section; an
"exited" trigger on a map without exits or with a count above the column's
sections. It SHALL warn when an exit lies more than 10 m from the map edge,
and when the requirement names the command section on a map without a fixed
column force (the player may bring no command section). Each problem SHALL
select the exit, or Map properties, or the event, when clicked.

#### Scenario: Exit behind the river
- **WHEN** an exit lies on an island no column soldier can walk to from the column's deployment area
- **THEN** the check reports it unreachable, and clicking the problem selects the exit

#### Scenario: Exit inside the deployment
- **WHEN** an exit overlaps the column's deployment area
- **THEN** the check reports an error on that exit

#### Scenario: Requirement too large
- **WHEN** the map's fixed column force has three sections and the requirement is 4
- **THEN** the check reports an error that opens Map properties when clicked
