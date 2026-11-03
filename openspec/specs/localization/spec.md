# localization Specification

## Purpose
Makes the game bilingual from the first build: English source strings with PT-BR
and EN locales, a working language switch and validation that prevents missing
translations from shipping.

## Requirements

### Requirement: English source catalog

All player-facing strings SHALL come from a string catalog whose source language
is English. Application code SHALL NOT contain hardcoded player-facing text.

#### Scenario: Start screen uses the catalog

- **WHEN** the start screen renders in English
- **THEN** its title, labels and actions resolve from the English catalog

#### Scenario: Hardcoded player text is rejected

- **WHEN** the localization check scans player-facing components
- **THEN** it reports hardcoded text as a failure

### Requirement: PT-BR and EN locales

The game SHALL ship with complete PT-BR and EN locale files and SHALL let the
player switch language from the start screen.

#### Scenario: Language switch updates the UI

- **WHEN** the player switches from English to PT-BR on the start screen
- **THEN** all visible start-screen strings update to PT-BR without a reload

#### Scenario: Both locales are complete

- **WHEN** the localization check compares locale keys
- **THEN** every key present in the English catalog is present in PT-BR and EN

### Requirement: Missing-key validation

The check pipeline SHALL fail when a required key is missing from either locale
or when a locale contains a key that is not in the English source catalog.

#### Scenario: Missing key fails the check

- **WHEN** a key is removed from the PT-BR locale
- **THEN** the localization check exits non-zero and names the missing key

#### Scenario: Extra key fails the check

- **WHEN** a locale contains a key absent from the English source catalog
- **THEN** the localization check exits non-zero and names the extra key

### Requirement: Language persistence

The selected language SHALL persist across reloads and SHALL default to the
browser language when it is PT-BR or EN, otherwise to English.

#### Scenario: Selection survives reload

- **WHEN** the player selects PT-BR and reloads the game
- **THEN** the start screen returns in PT-BR

### Requirement: Stance controls

The HUD SHALL expose stand, crouch and prone actions for the debug column, with
PT-BR and EN labels from the locale catalog.

#### Scenario: Stance buttons issue commands

- **WHEN** the player presses stand, crouch or prone
- **THEN** the corresponding stance command is sent through the command boundary

#### Scenario: Labels are localized

- **WHEN** the language changes
- **THEN** the stance controls update without a reload

### Requirement: Combat and squad labels

The HUD SHALL expose PT-BR and EN labels for sections, stance, pause, speed,
objective, outcome, ammunition and morale.

#### Scenario: Labels switch language

- **WHEN** the player changes language
- **THEN** the squad, stance, speed, objective and outcome labels update without a reload

#### Scenario: Rejection labels cover attack errors

- **WHEN** an attack command is rejected for an unknown target
- **THEN** the debug log shows a localized reason
