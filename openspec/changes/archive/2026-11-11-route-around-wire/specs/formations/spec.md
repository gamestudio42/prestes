## MODIFIED Requirements

### Requirement: Coordinated advance

An advance SHALL assign one destination per fit soldier, preserve a unit reference
and limit separation. Destinations (formation, line and cover slots) SHALL be
matched to soldiers by minimum total distance, with ties broken by unit id, so
that soldiers' routes do not cross. Soldiers ordered to destinations near each
other SHALL follow one route for the section, each offset by its formation
position, and SHALL spread to their own destinations at the end of the route.
When several sections are ordered together, each section SHALL follow its own
route as a body, the same route the order preview draws for it.
Blocked routes SHALL recalculate; laggards SHALL slow or pause the group rather
than be teleported. The result SHALL be deterministic for the same seed and
commands.

#### Scenario: Assigned slots
- **WHEN** a unit advances to a destination
- **THEN** each fit soldier receives a distinct slot and path

#### Scenario: No crossing
- **WHEN** a section in line is ordered to a line of slots ahead of it
- **THEN** the soldier on the left takes the leftmost slot and no two
  soldiers' straight routes to their slots cross

#### Scenario: Section marches as a body
- **WHEN** a section of 11 is ordered to a point 40 m away
- **THEN** its soldiers follow one shared route with formation offsets and stay
  within the cohesion limit of the section centroid while marching

#### Scenario: Several sections march as bodies
- **WHEN** three sections are selected together and ordered to a point 40 m away
- **THEN** each section follows its own shared route with formation offsets, and each soldier walks the route the preview drew for him

#### Scenario: Obstacle
- **WHEN** a soldier's route is blocked
- **THEN** the controller recalculates the route or falls back without breaking formation

#### Scenario: Laggard
- **WHEN** a soldier falls behind the cohesion limit
- **THEN** the unit waits, slows or requests regroup
