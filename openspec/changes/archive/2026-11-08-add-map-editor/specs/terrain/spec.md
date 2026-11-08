## ADDED Requirements

### Requirement: Grid heightfield terrain

A battle map SHALL be able to define its height as a stored grid of heights
on 2 m spacing (from the editor), as well as from features or authored
shapes. Heights SHALL be stored as whole centimetres so every thread reads
the same values, and sampling between nodes SHALL be bilinear. Slope, speed
and terrain sight rules SHALL apply to a grid heightfield as to a shape one.

#### Scenario: Grid height sampled
- **WHEN** a grid map stores 1.00 m and 3.00 m at two neighbouring nodes
- **THEN** the height halfway between them is 2.00 m

#### Scenario: Hill blocks sight
- **WHEN** a painted hill 6 m high lies between two standing men on a grid map
- **THEN** each is hidden from the other

### Requirement: Painted surfaces

A battle map SHALL be able to define its surface as a 1 m grid of painted
ground materials. Each material SHALL map to one terrain surface, and the
existing speed and cover rules SHALL apply to it. Roads, water and
vegetation drawn over the paint SHALL take precedence over it in the order
roads, then water, then vegetation, as on hand-written maps.

#### Scenario: Gravel speed
- **WHEN** a unit crosses painted gravel mapped to the dirt-road surface
- **THEN** its speed factor is the dirt-road factor

#### Scenario: Road over paint
- **WHEN** a road is drawn across painted mud
- **THEN** the cells under the road report the road's surface

### Requirement: Ground material drawing

The view SHALL draw the ground of a painted map with each cell's material
tile, sampled in world space with nearest filtering, and with a pixel
dither at the boundary between two materials. The ground of hand-written
maps SHALL keep its current look.

#### Scenario: Hand-written look unchanged
- **WHEN** the visual snapshot of the Fazenda is taken after this change
- **THEN** it matches the snapshot taken before
