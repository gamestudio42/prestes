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

### Requirement: Ordered facing

A ground order (move, advance, recon, defend, ambush, reserve) SHALL accept an
optional facing. With a facing, the section's current formation SHALL be laid
out around the destination rotated to that facing, matched and routed as any
other move, and each soldier SHALL face and aim that way on arrival and keep
it until a new order, a target or a face order changes it. Cover slots SHALL
be scored against the ordered facing when no enemy is known, and defend and
ambush SHALL use it instead of the facing toward the nearest enemy. Without a
facing, orders SHALL behave as before, deterministically.

#### Scenario: Wedge turned east
- **WHEN** a section in wedge is ordered to a point with facing east
- **THEN** its slots form a wedge whose point is the destination and whose
  arms trail to the west, and every soldier faces east on arrival

#### Scenario: Facing kept after arrival
- **WHEN** a section arrives with an ordered facing and no enemy is in sight
- **THEN** its soldiers keep that facing and aim while they hold

#### Scenario: Invalid facing
- **WHEN** a move carries a zero-length facing
- **THEN** the command is rejected with `invalid_position`

#### Scenario: No facing
- **WHEN** the same commands are replayed without facing
- **THEN** the simulation hash equals the golden replay

### Requirement: Ordered spacing

A ground order SHALL accept an optional spacing between soldiers, from 1.5 m
(close order) to 6 m; without one the spacing is the default 2.8 m. With a spacing, the formation slots SHALL use it, and the
section SHALL keep it for formation changes and bounding until an order without
spacing returns it to the default. A spacing that is not a finite number SHALL
be rejected with `invalid_position`; finite values SHALL be clamped to the
range.

#### Scenario: Open order
- **WHEN** a section in line is ordered to a point with a spacing of 5 m
- **THEN** neighbouring soldiers stand about 5 m apart on arrival

#### Scenario: Spacing kept while bounding
- **WHEN** a section with a 5 m spacing advances by bounds
- **THEN** both teams take slots 5 m apart

#### Scenario: Back to default
- **WHEN** a later move carries no spacing
- **THEN** the section returns to 2.8 m

### Requirement: Gaits by order

A moving soldier SHALL use a gait chosen by his order and situation, at an
absolute ground speed before posture, stance, terrain, cohesion, fatigue,
wounds and the group factor:

- slow, 1.0 m/s: recon;
- walk, 1.5 m/s: move, defend, advance between bounds, halt into cover;
- quick, 2.5 m/s: flank, attack closing on its target, regroup;
- run, 3.5 m/s: withdraw, the rushing team of a bound, attack following a
  target moving away, moving into cover under fire.

His own speed over 2 m/s SHALL scale his gaits (the officer is fitter).
Posture SHALL multiply them: aggressive 1.1, balanced 1.0, defensive 0.8.

#### Scenario: Recon is slower than a move
- **WHEN** two equal sections are ordered over the same open 30 m, one to
  move and one to recon
- **THEN** the recon section takes about one and a half times as long

#### Scenario: Withdraw runs
- **WHEN** a section on open ground is ordered to withdraw
- **THEN** its soldiers reach about 3.5 m/s

#### Scenario: The bound rushes
- **WHEN** a section advances by bounds
- **THEN** the moving team runs and the covering team holds

#### Scenario: Posture and gait combine
- **WHEN** a defensive section is ordered to move
- **THEN** it walks at 0.8 of 1.5 m/s

### Requirement: Running tires

Movement SHALL build fatigue at the march rate for slow and walk, 1.3 times
for quick and twice for run. A soldier whose fatigue passes 70 SHALL be
capped at a walk until it falls below 50.

#### Scenario: A winded soldier walks
- **WHEN** a soldier runs until his fatigue passes 70
- **THEN** he walks until it falls below 50, then runs again if his order
  still calls for it

### Requirement: Speed eases in and out

A soldier SHALL change speed by at most 3 m/s² and SHALL slow before his
destination so he stops on it rather than at full speed.

#### Scenario: Starting off
- **WHEN** a halted soldier is ordered to withdraw
- **THEN** he reaches his run about a second later, not on the first tick

#### Scenario: Stopping on the slot
- **WHEN** a walking soldier nears his slot
- **THEN** he slows over the last half metre and stops on it

### Requirement: Recon sweep

Soldiers on a recon order with no target SHALL sweep their facing left and
right of their front, about 50 degrees each way on a 4 s cycle, each with
his own phase, while moving and while halted; their recon report SHALL reach
15% further (18.4 m instead of 16 m).

#### Scenario: Scouts look round
- **WHEN** a recon party halts on its point with no enemy in sight
- **THEN** each scout's facing swings through about 100 degrees within one
  cycle, the parties' marks out of step

#### Scenario: A longer report
- **WHEN** an enemy stands 17 m from a halted scout in clear sight
- **THEN** the recon report counts him

### Requirement: Posture stance

A defensive section SHALL move and halt crouched unless the player set a
stance; aggressive and balanced sections SHALL keep their stance.

#### Scenario: Defensive crouches
- **WHEN** the player sets a section defensive and orders a move
- **THEN** its soldiers move crouched

#### Scenario: Player stance wins
- **WHEN** the player orders the defensive section to stand
- **THEN** its soldiers stay standing

### Requirement: Rush length

In an attack by bounds, and in an advance while the section is still more
than 40 m from its slots, each rush of the moving team SHALL take a soldier to
cover up to 30 m ahead toward the objective when such cover is reachable, and
otherwise 12 to 20 m across the open (3 to 5 s at a run), never past the
objective. Cover qualifies only inside a 45-degree cone either side of the line
from the soldier to the objective and only when it brings him at least half a
rush (6 m) nearer the objective; a soldier never rushes sideways to cover. The
covering team SHALL hold until the rush ends. The rush length is a game
abstraction of infantry fire-and-movement practice.

#### Scenario: Rush across the open

- **WHEN** a section attacks by bounds across open ground toward an enemy 80 m
  away with no cover in between
- **THEN** each rush moves its team between 12 and 20 m

#### Scenario: Rush to cover

- **WHEN** a wall lies 25 m ahead on the way to the objective
- **THEN** the rushing soldiers make for the wall in one rush

#### Scenario: Last rush stops at the objective

- **WHEN** the objective is 8 m away
- **THEN** the rush ends at the objective, not past it

#### Scenario: No sideways rush

- **WHEN** the only cover in reach lies 25 m to the side and 2 m nearer the
  objective
- **THEN** the soldier rushes straight toward the objective instead
