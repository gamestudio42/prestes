## ADDED Requirements

### Requirement: Continuous placement rotation

Sandbox placement SHALL rotate continuously while Z or X is held, at 90 degrees
per second, and SHALL retain the angle when the key is released. Z and X SHALL
rotate in opposite directions.

#### Scenario: Hold to rotate
- **WHEN** the player holds Z or X with a placement tool active
- **THEN** the preview angle changes gradually and stops when released

### Requirement: Real rotated placement

Placed covers and troops SHALL use the same rotation shown in the preview.
Cover collision, line checks and pathfinding SHALL use the oriented footprint.
Troop formation offsets and facing SHALL follow the chosen rotation.

#### Scenario: Rotated cover
- **WHEN** the player places a cover rotated 90 degrees
- **THEN** the rendered cover and its collision footprint are rotated

#### Scenario: Rotated troop
- **WHEN** the player places a troop with a rotation
- **THEN** its soldiers occupy the rotated formation shown by the preview
