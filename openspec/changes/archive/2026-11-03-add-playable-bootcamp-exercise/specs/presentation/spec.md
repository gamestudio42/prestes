## ADDED Requirements

### Requirement: Mission objective HUD

During the bootcamp exercise the HUD SHALL show the current phase, the active
mission objectives, live objective progress, instructor text and phase progress.
It SHALL NOT require the player to complete a permanent list of every HUD action.
Optional drill hints SHALL be collapsible.

#### Scenario: Objective cards

- **WHEN** a phase is active
- **THEN** the panel lists that phase's objectives with their current progress

#### Scenario: Objective updates live

- **WHEN** the simulation frame changes soldier positions, suppression or the phase
  timer
- **THEN** the objective values update from the frame

#### Scenario: Optional drills

- **WHEN** the player expands the drill hints
- **THEN** the relevant commands are shown without gating phase progress

### Requirement: Objective markers

The scene SHALL render the active phase objective zones, enemy approach and
fallback positions as localized, readable markers. Markers SHALL be presentation
only and SHALL NOT create simulation cover or collision.

#### Scenario: Zone marker

- **WHEN** the current objective is a reach, secure or hold zone
- **THEN** the scene shows a ring and translucent area at that zone

#### Scenario: Approach marker

- **WHEN** the hold phase starts
- **THEN** the scene marks the expected enemy approach

#### Scenario: Marker cleanup

- **WHEN** a phase completes
- **THEN** markers for the previous phase are removed

### Requirement: Failure and debrief HUD

The HUD SHALL show a localized failure reason and retry controls when the exercise
fails, and a localized debrief with exercise values when it completes. Failure
SHALL pause the simulation. The debrief SHALL offer replay and continue.

#### Scenario: Failure

- **WHEN** the hold phase fails
- **THEN** the simulation pauses and the HUD shows the reason and retry actions

#### Scenario: Debrief

- **WHEN** the hold phase succeeds
- **THEN** the simulation pauses and the HUD shows completion time and unit status

## MODIFIED Requirements

### Requirement: Boot Camp entry and tutorial shell

The start screen SHALL expose a localized Boot Camp action. During the boot camp,
the HUD SHALL show the active exercise phase, mission objectives, instructor text,
failure or completion status and progression through the three-phase exercise. The
panel SHALL read only from frames and exercise state.

#### Scenario: Start screen offers boot camp
- **WHEN** the start screen is shown
- **THEN** it offers a localized Boot Camp action without replacing the existing
  language and codex actions

#### Scenario: Tutorial HUD is active
- **WHEN** a boot camp phase is playing
- **THEN** the HUD shows the phase, objectives, instructor text and live progress

#### Scenario: Feedback resolves through locales
- **WHEN** the active locale changes
- **THEN** boot camp labels, objectives, failure and debrief update without
  reloading the scene

#### Scenario: Normal HUD is unchanged
- **WHEN** the normal skirmish or sandbox session is played
- **THEN** the exercise panel is absent and the existing orders HUD remains
  available

## REMOVED Requirements

### Requirement: Training campaign screen

**Reason**: The player-facing ten-mission training campaign is not part of the
single bootcamp experience. The start screen exposes only the bootcamp action,
language selector and codex.

**Migration**: The bootcamp objective panel replaces the campaign overview. The
legacy campaign content and screen are removed from the player-facing path; no
player progress is migrated from the campaign screen.

