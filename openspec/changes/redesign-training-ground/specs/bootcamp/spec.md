## ADDED Requirements

### Requirement: Training ground course

The bootcamp SHALL take place on a dedicated training map, a fictional army
training field near Vila Militar / Deodoro, Rio de Janeiro, in 1922. Historical
note: Prestes served in the 1st Engineer Company at Deodoro in 1922 and the
conspiracy was organized around Vila Militar (Macaulay, *The Prestes Column*,
1974, ch. II, pp. 37-38); the field, its layout and its officers are fictional.
The commander of every station is the officer instructor (an NPC) and the
perspective is the player's training section.

The map SHALL lay out one course along a road with one area per station, in
station order: parade ground and barracks (formation), firing range (fire),
maneuver field (maneuver), training trench line (defense), farm hamlet (recon),
aid post (wounded) and assault line (final). Each station SHALL start with the
section at the entry of its own area, and its objectives, markers and training
troop SHALL lie inside that area. The training map SHALL NOT contain sandbox
props. Area names SHALL come from the PT-BR and EN locale catalogs.

#### Scenario: Stations follow the road

- **WHEN** the player completes a station
- **THEN** the next station starts in the next area along the road and the
  section starts at that area's entry

#### Scenario: Station content stays in its area

- **WHEN** any station starts
- **THEN** its markers, objective points and training troop are inside its own
  area

#### Scenario: No sandbox props

- **WHEN** the training map is built
- **THEN** it contains only the training ground's covers, buildings and props,
  and the same data drives the simulation and the view

#### Scenario: Saved progress resumes

- **WHEN** a player with saved progress at station 4 continues
- **THEN** station 4 starts in the training trench area

### Requirement: Commander balloon

The instructor's current order SHALL be shown in a speech balloon over the
instructor in the world and in the training panel, and SHALL change when the
current objective changes. When the instructor is off screen the balloon SHALL
be hidden and the panel SHALL still show the order. The text SHALL come from the
PT-BR and EN locale catalogs; no voice audio is required.

#### Scenario: Balloon shows the order

- **WHEN** an objective becomes current
- **THEN** a balloon over the instructor shows that objective's order

#### Scenario: Off-screen instructor

- **WHEN** the camera moves so the instructor is off screen
- **THEN** the balloon is hidden and the panel still shows the order
