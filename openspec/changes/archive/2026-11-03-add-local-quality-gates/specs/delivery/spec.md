## ADDED Requirements

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
