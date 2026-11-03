## MODIFIED Requirements

### Requirement: Six checkpointed chapters

The boot camp SHALL define six ordered chapters but SHALL present five active
chapters while the Contact chapter is paused for the training-layout replacement.
Each active chapter SHALL have a checkpoint, and completing a chapter SHALL make
its checkpoint resumable. A saved Contact checkpoint SHALL resume at the next
active chapter.

#### Scenario: Chapter completion checkpoints

- **WHEN** the player completes an active chapter's required actions
- **THEN** the chapter is marked complete and its checkpoint is stored locally

#### Scenario: Resume from checkpoint

- **WHEN** the player returns to the boot camp after leaving
- **THEN** the completed active chapters remain available to resume or replay

#### Scenario: Chapter order

- **WHEN** an active chapter is current
- **THEN** later active chapters are not required before the current chapter's
  objective is complete

#### Scenario: Paused Contact resumes forward

- **WHEN** the saved active chapter is Contact
- **THEN** the boot camp starts at Orders instead of an unusable target chapter

### Requirement: Training targets before real combat

The boot camp SHALL NOT spawn training targets while Contact is paused. The
active chapters SHALL run without a target board: ground, field, orders,
casualties and graduation. Sandbox target dummies SHALL remain available outside
the boot camp.

#### Scenario: No real enemy in basic training

- **WHEN** the player is in ground or field
- **THEN** no training target or target board is available

#### Scenario: Real combat begins

- **WHEN** the player starts the Orders chapter
- **THEN** the legalist reinforcement is used as the first real opposing force

#### Scenario: Both sides only in free play

- **WHEN** the player is in ground, field, orders or casualties
- **THEN** both-sides control is unavailable
- **AND WHEN** the player starts graduation
- **THEN** both-sides control and sandbox tools become available

#### Scenario: No training targets

- **WHEN** the player enters any active boot camp chapter
- **THEN** no target dummy or target board is spawned

#### Scenario: Sandbox target remains

- **WHEN** the player opens the sandbox outside the boot camp
- **THEN** the target-dummy tool is still available

### Requirement: Mechanic coverage

The five active chapters SHALL require camera bands, selection modes, stances,
movement, terrain, cover, formations, fatigue, tactical orders, incapacitation,
rescue, recovery and the both-sides free-play tools. Fire, ammunition and
suppression coverage SHALL return with the Contact layout.

#### Scenario: Core command chapter

- **WHEN** the player completes ground and field
- **THEN** camera, selection, stance, movement, terrain, cover and formation
  actions have each been required at least once

#### Scenario: Combat chapter

- **WHEN** the Contact layout returns and the player completes Contact and Orders
- **THEN** fire, ammunition, suppression, morale, flank, withdraw, hold and the
  tactical order catalogue have each been required at least once

#### Scenario: Casualty chapter

- **WHEN** the player completes casualties
- **THEN** a casualty is created, carried to cover, treated, evacuated and
  recovered, and a second casualty demonstrates the rescue queue

#### Scenario: Free play chapter

- **WHEN** the player completes graduation
- **THEN** both sides have been controlled and at least one sandbox reinforcement
  or cover tool has been used

### Requirement: Deterministic acceptance run

The boot camp SHALL be playable deterministically with a fixed seed and SHALL have
an automated browser acceptance run that completes every active chapter and
records a video.

#### Scenario: Deterministic boot camp

- **WHEN** the same boot camp commands run twice
- **THEN** both runs produce the same simulation hash at the same tick

#### Scenario: Acceptance video

- **WHEN** the browser acceptance test completes the active boot camp
- **THEN** it verifies every active checkpoint and writes a video artifact
