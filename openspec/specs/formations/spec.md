# formations Specification

## Purpose
Defines coordinated movement, formations, cohesion, fatigue and defensive regions.

## Requirements

### Requirement: Coordinated advance

An advance SHALL assign one destination per fit soldier, preserve a unit reference
and limit separation. Destinations (formation, line and cover slots) SHALL be
matched to soldiers by minimum total distance, with ties broken by unit id, so
that soldiers' routes do not cross. Soldiers ordered to destinations near each
other SHALL follow one route for the section, each offset by its formation
position, and SHALL spread to their own destinations at the end of the route.
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

#### Scenario: Obstacle
- **WHEN** a soldier's route is blocked
- **THEN** the controller recalculates the route or falls back without breaking formation

#### Scenario: Laggard
- **WHEN** a soldier falls behind the cohesion limit
- **THEN** the unit waits, slows or requests regroup

### Requirement: Formations

The unit SHALL support column, line, wedge and free formations. Formation changes
SHALL be possible without replacing the primary order.

#### Scenario: Formation change
- **WHEN** the player changes formation during an advance
- **THEN** slots are redistributed and the primary order remains active

#### Scenario: Narrow ground
- **WHEN** a line formation cannot fit
- **THEN** the controller uses a compatible formation or reports the restriction

### Requirement: Cohesion

Cohesion SHALL derive from spacing, group separation, losses, officer presence and
collective success. Low cohesion SHALL slow coordinated execution and request
regroup.

#### Scenario: Spacing loss
- **WHEN** soldiers exceed the cohesion distance
- **THEN** cohesion falls and movement coordination degrades

#### Scenario: Regroup
- **WHEN** regroup completes
- **THEN** eligible soldiers are within the unit reference and cohesion recovers

### Requirement: Fatigue

Fatigue SHALL rise with movement, combat and carrying, reduce speed and efficiency,
and recover during rest or between battles.

#### Scenario: Long movement
- **WHEN** a soldier moves for a long period
- **THEN** fatigue rises and movement speed falls

#### Scenario: Rest
- **WHEN** a soldier remains out of action
- **THEN** fatigue recovers without healing a wound

### Requirement: Defend and reserve positions

Defend SHALL keep soldiers inside a designated region and use covered positions
without uncontrolled pursuit. Reserve SHALL suppress automatic engagement and keep
the unit available.

#### Scenario: Defend
- **WHEN** an enemy leaves the defended region
- **THEN** soldiers do not automatically chase outside it

#### Scenario: Reserve
- **WHEN** a unit is in reserve
- **THEN** it does not auto-engage and remains available for a new order

### Requirement: Ambush, recon and pursue

Ambush SHALL wait for one activation condition; recon SHALL explore and report;
pursue SHALL follow a valid retreating target until conditions fail.

#### Scenario: Ambush activation
- **WHEN** the ambush condition is met
- **THEN** the unit activates once and transitions to its follow-up order

#### Scenario: Recon
- **WHEN** recon reaches its region
- **THEN** it reveals information and avoids unnecessary engagement

#### Scenario: Pursue stops
- **WHEN** the target becomes unavailable or the unit is critically fatigued or demoralised
- **THEN** pursuit ends and the unit awaits orders

### Requirement: Formation slots yield to cover

Formation slots SHALL define the group's shape but SHALL NOT force a soldier to
stand exposed when a reachable cover position is available.

#### Scenario: Formation with cover
- **WHEN** a formation move has nearby reachable cover
- **THEN** each eligible soldier uses cover while the group keeps its general
  direction and spacing

#### Scenario: Formation without cover
- **WHEN** no nearby cover is reachable
- **THEN** the formation slots are used unchanged

#### Scenario: Formation change during cover
- **WHEN** the player changes formation while soldiers are moving to cover
- **THEN** the primary order remains and the cover plan is retained where valid
