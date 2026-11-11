# terrain Specification

## Purpose
Defines the deterministic sandbox terrain: its height, surfaces and how height and
surface change movement speed and cover.

## Requirements

### Requirement: Deterministic terrain height

The sandbox SHALL define terrain from deterministic height features. Height SHALL
be a pure function of position and SHALL be used by both simulation and view.

#### Scenario: Ridge is high ground

- **WHEN** a position is inside the ridge feature
- **THEN** its terrain height is greater than flat ground

#### Scenario: Trench is low ground

- **WHEN** a position is inside the trench feature
- **THEN** its terrain height is lower than flat ground

#### Scenario: Height is deterministic

- **WHEN** the same position is sampled twice
- **THEN** both samples return the same height

### Requirement: Terrain changes movement speed

Unit movement SHALL be multiplied by a terrain speed factor derived from local
slope and surface. Uphill and rough ground SHALL reduce speed; road SHALL increase
it.

#### Scenario: Ridge slows movement

- **WHEN** a unit crosses the ridge
- **THEN** its step is smaller than on flat grass

#### Scenario: Road speeds movement

- **WHEN** a unit moves on the road surface
- **THEN** its speed factor is greater than on grass

### Requirement: Terrain provides cover

Terrain SHALL provide cover when the unit is in a trench or crater, or when a
ridge lies between the unit and the threat. Terrain and sandbag cover SHALL NOT
stack; the higher value applies.

#### Scenario: Trench cover

- **WHEN** a unit stands inside the trench
- **THEN** it receives trench cover against a threat

#### Scenario: Ridge cover

- **WHEN** the ridge lies between a unit and the threat
- **THEN** the unit receives ridge cover

#### Scenario: Cover does not stack

- **WHEN** a unit has both sandbag and terrain cover
- **THEN** the effective cover is the higher value, not the sum

### Requirement: Training ground terrain

The training map SHALL have its own terrain features (road, parade ground,
firing range, fields and hedgerows), separate from the sandbox terrain, and the
simulation and the view SHALL read them from the same data. Terrain speed and
cover rules SHALL apply to it as to the sandbox terrain.

#### Scenario: Road speeds the march

- **WHEN** a section marches along the training road
- **THEN** it moves at the road's terrain speed

#### Scenario: Other maps unchanged

- **WHEN** the battle lab or a non-training engine starts
- **THEN** it uses its existing terrain and props, not the training ground

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
dither at the boundary between two materials. Every battle map is an
authored, painted map; the hand-written maps were removed
(author-game-maps 3.6).

#### Scenario: Hand-written look unchanged
- **WHEN** the test map (`campo-de-provas`) is drawn
- **THEN** each cell shows its material tile and two neighbouring materials meet in a pixel dither

### Requirement: Map heightfield

A map MAY define its height as a heightfield: a regular grid of heights
authored from deterministic shapes (hills, ridges, valleys, river channels,
embankments, trench cuts) and sampled with bilinear interpolation. Height
SHALL remain a pure function of position and map, used by both simulation
and view. Maps without a heightfield SHALL keep the feature-based height.

#### Scenario: Hill is high ground
- **WHEN** an authored map raises a hill 12 m above its riverbank
- **THEN** a position on the hill top samples at least 12 m above the riverbank

#### Scenario: Smooth sampling
- **WHEN** height is sampled at two points 0.1 m apart
- **THEN** the two heights differ by less than the steepest slope of the map times 0.1 m

### Requirement: Terrain blocks sight and fire

A line between an observer's eye and a target's eye SHALL be blocked when
the ground rises above it at any point between them. This SHALL apply to
fog-of-war side vision, to target acquisition and to shots. Eye heights by
stance SHALL be added to the ground height at each end.

#### Scenario: Behind the crest
- **WHEN** a soldier lies prone 3 m behind a crest that is 1 m above his eye
- **THEN** an enemy on the other side cannot see or hit him

#### Scenario: Over the crest
- **WHEN** the same soldier stands up and his eye is above the crest line from the enemy
- **THEN** the enemy can see him

### Requirement: Water and crossings

A map MAY define water. Deep water SHALL be impassable and SHALL NOT be an
order target. A ford SHALL be walkable with a speed factor of 0.5, SHALL give
no cover and SHALL NOT allow the prone stance. A bridge SHALL be a walkable
deck over deep water, as wide as its model, with low rails that give no
cover. A ferry SHALL carry up to six soldiers between its two landings,
taking 20 s per crossing, and SHALL move only when soldiers ordered across
are aboard or it is called from the far landing. Soldiers on the ferry SHALL
NOT fire and SHALL have no cover.

#### Scenario: Ford slows
- **WHEN** a section crosses the ford
- **THEN** it moves at half its pasture speed and cannot go prone there

#### Scenario: Ferry trips
- **WHEN** a section of eleven is ordered across the river by the ferry
- **THEN** it crosses in two trips, six then five, and arrives about 60 s later

#### Scenario: Ferry is deterministic
- **WHEN** the same ferry orders run twice from the same state
- **THEN** both runs end with the same state hash

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

### Requirement: Barbed-wire fences

A barbed-wire fence SHALL be crossable: it SHALL slow a soldier's movement but
SHALL NOT stop his path. Crossing one SHALL cost a small, fixed amount of
health once per crossing, never below 1 health, and the loss SHALL be
deterministic. A wire fence SHALL NOT block sight and SHALL NOT stop fire, and
it SHALL give no cover.

#### Scenario: Crossing a wire fence
- **WHEN** a section is ordered across a barbed-wire fence
- **THEN** the soldiers cross it, each losing the same small amount of health once, and continue

#### Scenario: Fire through the wire
- **WHEN** a soldier has an enemy in range and line beyond a barbed-wire fence
- **THEN** he sees and fires on him, and the wire gives cover to neither man

#### Scenario: One loss per crossing
- **WHEN** a soldier crosses a stretch of wire once
- **THEN** he loses the health once, not on every tick of the crossing

#### Scenario: Never fatal
- **WHEN** a soldier at 1 health crosses a wire fence
- **THEN** he stays at 1 health, alive
