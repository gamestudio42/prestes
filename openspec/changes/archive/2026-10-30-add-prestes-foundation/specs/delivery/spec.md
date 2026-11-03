## Purpose

Makes the project verifiable and publishable from the start: one check command,
a static browser build, CI on pull requests and automatic GitHub Pages delivery.

## ADDED Requirements

### Requirement: Single check command

The repository SHALL provide one check command that runs type checking, linting
and unit tests, and SHALL exit non-zero when any of them fails.

#### Scenario: Check passes on a clean tree

- **WHEN** the check command runs on a clean, valid tree
- **THEN** it exits zero and reports typecheck, lint and test results

#### Scenario: Check fails on a type error

- **WHEN** a type error is introduced
- **THEN** the check command exits non-zero and reports the error

### Requirement: Static browser build

The build command SHALL produce a static browser build in `apps/game/dist` that
uses relative asset paths and can be served from a subdirectory.

#### Scenario: Build output exists

- **WHEN** the build command runs
- **THEN** `apps/game/dist/index.html` and its assets exist

#### Scenario: Build works from a subpath

- **WHEN** the built game is served from a nested path
- **THEN** it loads without absolute-path 404s

### Requirement: Continuous integration

CI SHALL run the check command on every push and pull request, and on the main
branch SHALL also upload the build and deploy it to GitHub Pages.

#### Scenario: Pull request runs checks

- **WHEN** a pull request is opened or updated
- **THEN** CI runs the check command and reports its result

#### Scenario: Main deploys Pages

- **WHEN** a commit lands on main and checks pass
- **THEN** CI publishes the build to GitHub Pages

### Requirement: Browser smoke test

The repository SHALL include a browser smoke test that boots the built game,
reaches the start screen and switches language without a fatal error.

#### Scenario: Smoke test passes

- **WHEN** the smoke test runs against the build
- **THEN** it reaches the start screen, switches to PT-BR and reports success

### Requirement: Runtime contract

The repository SHALL declare Node.js 22 or newer and pnpm 10 as its required
development runtime, and CI SHALL use the declared Node.js major version.

#### Scenario: Runtime is declared

- **WHEN** the root manifest is read
- **THEN** it declares the Node.js and pnpm requirements and exposes the documented scripts
