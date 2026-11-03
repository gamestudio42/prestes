## ADDED Requirements

### Requirement: Original model pipeline

The repository SHALL provide a model preparation pipeline that turns original
low-poly source models into optimized GLB files for the game, and SHALL record
the source, licence and export command in the asset register.

#### Scenario: Model export runs

- **WHEN** `pnpm models` runs with the source files present
- **THEN** optimized GLB files are written under `apps/game/public/models/`

#### Scenario: Model source is registered

- **WHEN** the asset register is read
- **THEN** each character model lists its source, licence and export command

### Requirement: Font and icon dependencies

The game SHALL self-host Barlow and Barlow Condensed and bundle Lucide icons, and
the asset register SHALL record their OFL and ISC licences.

#### Scenario: Build contains no external font request

- **WHEN** the built game is inspected
- **THEN** font assets are served from the build and no external font URL is requested

#### Scenario: Licences are registered

- **WHEN** the asset register is read
- **THEN** Barlow, Barlow Condensed and Lucide are listed with their licences

## MODIFIED Requirements

### Requirement: Browser smoke test

The repository SHALL include a browser smoke test that boots the game, switches
language, starts the session, exercises the debug move path and toggles the post
quality without a fatal error.

#### Scenario: Smoke test passes

- **WHEN** the smoke test runs against the dev server
- **THEN** it reaches the start screen, switches to PT-BR, starts, draws a movement path and changes the post mode
