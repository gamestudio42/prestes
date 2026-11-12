## ADDED Requirements

### Requirement: Map north

Every map document SHALL be able to carry the direction of true north on
its grid, as a bearing in degrees clockwise from the grid's top edge.
Maps without it SHALL treat the top edge as north. The value SHALL be
normalised to the range 0 to below 360 on load, a non-numeric value SHALL
make the document invalid, and the document format SHALL move to version 7
so older builds refuse such maps. North SHALL change only the picture and
the HUD: the simulation, line of sight and the state hash SHALL NOT depend
on it. No player-facing text is added by the field itself.

#### Scenario: Read back
- **WHEN** a map with north 30 is saved and loaded again
- **THEN** its north is 30

#### Scenario: Default
- **WHEN** a version 6 map document is loaded
- **THEN** it is upgraded to version 7 with north 0

#### Scenario: Invalid
- **WHEN** a document's north is a string
- **THEN** it is rejected as invalid naming `north`

## MODIFIED Requirements

### Requirement: Time of day

Every map document SHALL carry a time of day, from early morning to late
afternoon, and a sun direction (the compass bearing the sun shines from,
measured from the map's true north).
The battle view SHALL light the map with them: the sun's height follows the
time of day (low in the morning and late afternoon, high at midday), the
light warms toward the ends of the day, and the sun shines from the
bearing. Maps without the fields SHALL light as midday from the north-east.
The time of day SHALL change only the picture: the simulation, line of
sight and the state hash SHALL NOT depend on it.

#### Scenario: Low sun models the hills
- **WHEN** a map is set to late afternoon with the sun from the west
- **THEN** in battle the west faces of its hills are lit and the east faces darker, more than at midday

#### Scenario: The hash ignores the time of day
- **WHEN** the same battle is run on a map set to morning and then to late afternoon
- **THEN** both runs give the same state hash

#### Scenario: Sun follows north
- **WHEN** a map with the sun from the north (bearing 0) has its north turned to 90
- **THEN** the sun shines from the grid's right edge
