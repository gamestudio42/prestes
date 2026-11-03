## Purpose

Defines the fictional Campo de Instrução boot camp: a guided, checkpointed
training scenario that teaches every implemented combat mechanic and serves as
the project's end-to-end acceptance map. The commander is a fictional instructor
of the training cadre; the perspective is section command. It makes no historical
claim and is labelled fictional.

## ADDED Requirements

### Requirement: Fictional training ground

The boot camp SHALL be a fictional training map, visually and textually labelled
as training content, with no claim to a historical battle or historical commander.

#### Scenario: Fictional label is visible
- **WHEN** the player enters the boot camp
- **THEN** the screen identifies it as fictional training content and names the
  training-cadre instructor perspective

#### Scenario: Historical campaign is not altered
- **WHEN** the boot camp is played
- **THEN** no historical mission, figure record or source claim is created or
  changed

### Requirement: Six checkpointed chapters

The boot camp SHALL present six ordered chapters. Each chapter SHALL have a
checkpoint, and completing a chapter SHALL make its checkpoint resumable.

#### Scenario: Chapter completion checkpoints
- **WHEN** the player completes a chapter's required actions
- **THEN** the chapter is marked complete and its checkpoint is stored locally

#### Scenario: Resume from checkpoint
- **WHEN** the player returns to the boot camp after leaving
- **THEN** the completed chapters remain available to resume or replay

#### Scenario: Chapter order
- **WHEN** a chapter is active
- **THEN** later chapters are not required before the active chapter's objective
  is complete

### Requirement: Training targets before real combat

Chapters one through three SHALL use training targets or scripted dummies.
Chapter four SHALL introduce the first real opposing force. Chapter five SHALL
use the casualty lane. Chapter six SHALL enable both-sides control.

#### Scenario: No real enemy in basic training
- **WHEN** the player is in chapters one through three
- **THEN** the available opposition is training targets or scripted dummies

#### Scenario: Real combat begins
- **WHEN** the player starts chapter four
- **THEN** a real opposing force enters the exercise

#### Scenario: Both sides only in free play
- **WHEN** the player is in chapters one through five
- **THEN** both-sides control is unavailable
- **AND WHEN** the player starts chapter six
- **THEN** both-sides control and sandbox tools become available

### Requirement: Tutorial director feedback

The boot camp SHALL show the current objective, a short hint and completion
feedback for every required action. The director SHALL observe simulation frames
and events without becoming a second source of combat state.

#### Scenario: Objective advances
- **WHEN** the player performs the action required by the current step
- **THEN** the objective advances and completion feedback is shown

#### Scenario: Wrong action is recoverable
- **WHEN** the player issues a different valid order or targets the wrong object
- **THEN** the tutorial explains the expected action without corrupting the
  simulation or losing the checkpoint

#### Scenario: Feedback is localized
- **WHEN** the locale is PT-BR or EN
- **THEN** objectives, hints, feedback and checkpoint labels use the active locale

### Requirement: Mechanic coverage

The six chapters SHALL require the player to use camera bands, selection modes,
stances, movement, terrain, cover, formations, fatigue, ammunition, suppression,
morale, flanking, withdraw, hold, defend, ambush, recon, reserve, pursue,
disperse, regroup, protect-officer, incapacitation, rescue, recovery and the
both-sides free-play tools.

#### Scenario: Core command chapter
- **WHEN** the player completes chapters one and two
- **THEN** camera, selection, stance, movement, terrain, cover and formation
  actions have each been required at least once

#### Scenario: Combat chapter
- **WHEN** the player completes chapters three and four
- **THEN** fire, ammunition, suppression, morale, flank, withdraw, hold and the
  tactical order catalogue have each been required at least once

#### Scenario: Casualty chapter
- **WHEN** the player completes chapter five
- **THEN** a casualty is created, carried to cover, treated, evacuated and
  recovered, and a second casualty demonstrates the rescue queue

#### Scenario: Free play chapter
- **WHEN** the player completes chapter six
- **THEN** both sides have been controlled and at least one sandbox reinforcement
  or cover tool has been used

### Requirement: Deterministic acceptance run

The boot camp SHALL be playable deterministically with a fixed seed and SHALL have
an automated browser acceptance run that completes every chapter and records a
video.

#### Scenario: Deterministic boot camp
- **WHEN** the same boot camp commands run twice
- **THEN** both runs produce the same simulation hash at the same tick

#### Scenario: Acceptance video
- **WHEN** the browser acceptance test completes the boot camp
- **THEN** it verifies every chapter checkpoint and writes a video artifact

### Requirement: Localized training content

Boot camp names, objectives, hints, feedback, checkpoint labels and graduation
copy SHALL exist in EN and PT-BR, with EN as the source language.

#### Scenario: Key parity
- **WHEN** locale validation runs
- **THEN** EN and PT-BR contain the same boot camp keys

#### Scenario: No hardcoded copy
- **WHEN** the boot camp UI is inspected
- **THEN** all player-facing boot camp copy resolves through the locale catalog
