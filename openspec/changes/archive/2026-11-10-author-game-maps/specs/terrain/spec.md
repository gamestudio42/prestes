## MODIFIED Requirements

### Requirement: Map surfaces

The surfaces SHALL include grass, pasture, dirt road, cobbles, crop, tall
grass, scrub, mud, ford, trench floor and building floor, and each SHALL
have a speed factor. The starting factors SHALL be: dirt road 1.15, cobbles
1.1, grass and pasture 1, tall grass 0.9, scrub 0.8, crop 0.7, mud 0.6,
trench floor 0.6, ford 0.5. Slope SHALL still reduce speed as it does now.

#### Scenario: Cane is slow
- **WHEN** a section walks into a canefield from the pasture
- **THEN** its speed factor drops to 0.7 of pasture

#### Scenario: Default map unchanged
- **WHEN** a section crosses the test map's ford
- **THEN** its speed factor is 0.5 of grass

### Requirement: Ground material drawing

The view SHALL draw the ground of a painted map with each cell's material
tile, sampled in world space with nearest filtering, and with a pixel
dither at the boundary between two materials. Every battle map is an
authored, painted map; the hand-written maps were removed
(author-game-maps 3.6).

#### Scenario: Hand-written look unchanged
- **WHEN** the test map (`campo-de-provas`) is drawn
- **THEN** each cell shows its material tile and two neighbouring materials meet in a pixel dither
