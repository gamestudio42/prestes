## ADDED Requirements

### Requirement: Order tempo

Each ground order SHALL move at its own pace, multiplying the soldier's
speed: move 1.0, advance 0.8, recon 0.5, pursue 1.3, withdraw 1.2, flank
1.1, defend, ambush and reserve 0.9; other orders 1.0. The posture SHALL
multiply it too: aggressive 1.1, balanced 1.0, defensive 0.65. Pursuit SHALL
build fatigue twice as fast as a march.

#### Scenario: Recon is slow
- **WHEN** two equal sections are ordered over the same open 40 m, one to
  move and one to recon
- **THEN** the recon section takes about twice as long to arrive

#### Scenario: Posture and order combine
- **WHEN** a defensive section is ordered to advance
- **THEN** it moves at 0.8 x 0.65 of its march pace

### Requirement: Recon sweep

Soldiers on a recon order with no target SHALL sweep their facing left and
right of their front, about 50 degrees each way on a 4 s cycle, each with
his own phase, while moving and while halted; their sight range SHALL be 15%
longer.

#### Scenario: A scout sees to the side
- **WHEN** an enemy stands 60 degrees off a recon section's front within
  sight range
- **THEN** a scout's sweep brings him into view within one cycle, where a
  section on a move order would not see him

### Requirement: Posture stance

A defensive section SHALL move and halt crouched unless the player set a
stance; aggressive and balanced sections SHALL keep their stance.

#### Scenario: Defensive crouches
- **WHEN** the player sets a section defensive and orders a move
- **THEN** its soldiers move crouched

#### Scenario: Player stance wins
- **WHEN** the player orders the defensive section to stand
- **THEN** its soldiers stay standing
