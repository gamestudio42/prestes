## ADDED Requirements

### Requirement: Map heightfield

A map MAY define its height as a heightfield: a regular grid of heights
authored from deterministic shapes (hills, ridges, valleys, river channels,
embankments, trench cuts) and sampled with bilinear interpolation. Height
SHALL remain a pure function of position and map, used by both simulation
and view. Maps without a heightfield SHALL keep the feature-based height.

#### Scenario: Hill is high ground
- **WHEN** a position on Serra e Rio is on a hill top
- **THEN** its height is at least 12 m above the riverbank

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
- **WHEN** a section walks into the canefield from the pasture
- **THEN** its speed factor drops to 0.7 of pasture

#### Scenario: Default map unchanged
- **WHEN** the Vila Militar field is played
- **THEN** its surfaces and speed factors are the current ones
