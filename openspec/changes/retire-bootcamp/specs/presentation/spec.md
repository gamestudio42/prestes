## ADDED Requirements

### Requirement: Skirmish-first boot flow

The game SHALL load in a supported desktop browser and reach a start screen with
the game title, a final tagline, a language selector, an audio option, the codex
and the skirmish action. The campaign page SHALL say, localized in PT-BR and EN,
that the campaign and its manual are in preparation and SHALL lead to the
skirmish page; it SHALL NOT offer a bootcamp. Saved bootcamp progress SHALL be
ignored and cleared. The period kicker SHALL appear once.

#### Scenario: Start screen loads

- **WHEN** the player opens the built game in a browser
- **THEN** the start screen appears without a fatal error and exposes the language
  selector, the audio option and the codex

#### Scenario: No bootcamp on the menu

- **WHEN** the player opens any page of the book menu
- **THEN** no bootcamp start, continue or restart action is offered

#### Scenario: Old progress is cleared

- **WHEN** the game loads with saved bootcamp progress in local storage
- **THEN** the progress is removed and the menu shows no bootcamp action

#### Scenario: Skirmish reaches the scene

- **WHEN** the player starts the 3 vs 3 from the skirmish page
- **THEN** the scene loads and the HUD shell becomes visible

## REMOVED Requirements

### Requirement: Browser boot flow
**Reason**: Its start screen offered the bootcamp actions (start, continue, restart), which are retired.
**Migration**: Replaced by "Skirmish-first boot flow".

### Requirement: Boot Camp entry and tutorial shell
**Reason**: Bootcamp-only HUD; the bootcamp is retired from the game.
**Migration**: None; the coming tutorial defines its own teaching UI.

### Requirement: Mission objective HUD
**Reason**: Bootcamp-only HUD; the bootcamp is retired from the game.
**Migration**: None; the coming tutorial defines its own teaching UI.

### Requirement: Objective markers
**Reason**: Bootcamp-only HUD; the bootcamp is retired from the game.
**Migration**: None; the coming tutorial defines its own teaching UI.

### Requirement: Failure and debrief HUD
**Reason**: Bootcamp-only HUD; the bootcamp is retired from the game.
**Migration**: None; the coming tutorial defines its own teaching UI.

