## ADDED Requirements

### Requirement: Deployment areas

Every battle map SHALL define a deployment area for each side: a polygon
that holds that side's section points, does not overlap the other side's
area, and is at least half walkable. Hand-written maps SHALL carry their
areas in their data; an authored document without areas SHALL get, on load,
a default area around each side's points (their bounding box grown by 30 m
and clipped to the map and to its own half). The content check SHALL verify
the areas of every map.

#### Scenario: Old document gets areas
- **WHEN** a map document without deployment areas is loaded
- **THEN** each side has a default area holding its three section points, and the two areas do not overlap

#### Scenario: Content check
- **WHEN** a hand-written map's column area is edited to overlap the legalist area
- **THEN** `pnpm check:content` fails naming the map
