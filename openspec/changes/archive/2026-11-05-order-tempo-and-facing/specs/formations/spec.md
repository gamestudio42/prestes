## ADDED Requirements

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
