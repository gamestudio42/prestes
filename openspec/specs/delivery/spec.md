# delivery Specification

## Purpose
Makes the project verifiable and publishable from the start: one check command,
a static browser build, CI on pull requests and automatic GitHub Pages delivery.

## Requirements

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

The repository SHALL include a browser smoke test that boots the game, switches
language, starts the session, exercises the debug move path and toggles the post
quality without a fatal error.

#### Scenario: Smoke test passes

- **WHEN** the smoke test runs against the dev server
- **THEN** it reaches the start screen, switches to PT-BR, starts, draws a movement path and changes the post mode

### Requirement: Runtime contract

The repository SHALL declare Node.js 22 or newer and pnpm 10 as its required
development runtime, and CI SHALL use the declared Node.js major version.

#### Scenario: Runtime is declared

- **WHEN** the root manifest is read
- **THEN** it declares the Node.js and pnpm requirements and exposes the documented scripts

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

### Requirement: Local verification gate

The repository SHALL provide one local verify command that runs, in order, the
check command, the static build, the bundle budget check, the determinism check,
OpenSpec durable-spec validation and the browser suite. It SHALL stop at the
first failing step, exit non-zero, and print a summary that names each step with
its result and duration. A quick variant SHALL run the same steps without the
browser suite. Neither command SHALL push, contact a git remote or deploy.

#### Scenario: Verify passes on a clean tree

- **WHEN** the verify command runs on a clean, valid tree
- **THEN** every step runs, the summary lists each step as passed with its duration, and the command exits zero

#### Scenario: Verify stops at the first failure

- **WHEN** a step fails, for example the check command after a type error
- **THEN** later steps do not run, the summary marks the failed step and the skipped steps, and the command exits non-zero

#### Scenario: Quick verify skips the browser suite

- **WHEN** the quick verify command runs
- **THEN** it runs every step except the browser suite and reports the browser suite as not run

#### Scenario: Verify stays local

- **WHEN** either verify command runs in a repository with no git remote
- **THEN** it completes without network access to a git host and without changing git state

### Requirement: Determinism golden check

The repository SHALL provide a determinism check that runs a fixed, seeded
headless scenario covering movement, combat and orders twice in the same
process. It SHALL fail when the two runs produce different state hashes, and
SHALL fail when the hash differs from the golden value recorded in the
repository. An explicit update flag SHALL rewrite the golden value and print the
old and new hashes; the check SHALL never update the golden value without it.

#### Scenario: Same seed gives the same hash

- **WHEN** the determinism check runs on an unchanged simulation
- **THEN** both runs produce the same hash, it equals the golden value, and the check exits zero

#### Scenario: Behavior change is caught

- **WHEN** a simulation change alters the outcome of the fixed scenario
- **THEN** the check exits non-zero and prints the expected and actual hashes

#### Scenario: Nondeterminism is caught

- **WHEN** the two in-process runs produce different hashes
- **THEN** the check exits non-zero and reports nondeterminism, separately from a golden mismatch

#### Scenario: Intentional change updates the golden

- **WHEN** the check runs with the update flag
- **THEN** it writes the new hash to the golden file, prints the old and new values, and exits zero

### Requirement: Bundle budget

The repository SHALL record size limits for the built game's JavaScript and CSS
in a checked-in budget file, and SHALL provide a check that measures the built
assets, prints each measured size against its limit, and exits non-zero when any
limit is exceeded or when no build output exists.

#### Scenario: Build within budget

- **WHEN** the bundle check runs after a build whose assets are within the limits
- **THEN** it prints each size against its limit and exits zero

#### Scenario: Build over budget

- **WHEN** the built JavaScript exceeds its limit
- **THEN** the check exits non-zero and names the asset group, its size and the limit

#### Scenario: Missing build

- **WHEN** the bundle check runs with no build output
- **THEN** it exits non-zero and says the build must run first

### Requirement: Unit-test coverage threshold

The repository SHALL provide a coverage command that runs the unit tests with
coverage for the simulation, shared, kernel and content packages, writes the
report to an ignored local folder, and exits non-zero when line coverage falls
below the recorded threshold.

#### Scenario: Coverage at or above threshold

- **WHEN** the coverage command runs on the current tree
- **THEN** it writes a report under `coverage/` and exits zero

#### Scenario: Coverage drops below threshold

- **WHEN** coverage falls below the recorded threshold
- **THEN** the command exits non-zero and names the metric that failed
