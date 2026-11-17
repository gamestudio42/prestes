## MODIFIED Requirements

### Requirement: Original model pipeline

The repository SHALL provide a model preparation pipeline that turns original
low-poly source models into optimized GLB files for the game, and SHALL record
the source, licence and export command in the asset register. For animated
models the pipeline SHALL reduce the animation data (dropping redundant keys
and storing them at lower precision) and SHALL compress mesh data, and the
game SHALL load the compressed files without visible change in pose or
outline.

#### Scenario: Model export runs

- **WHEN** `pnpm models` runs with the source files present
- **THEN** optimized GLB files are written under `apps/game/public/models/`

#### Scenario: Model source is registered

- **WHEN** the asset register is read
- **THEN** each character model lists its source, licence and export command

#### Scenario: Compressed soldier matches the source

- **WHEN** the soldier is exported and loaded in the game
- **THEN** every clip's key poses match the source within 1 cm at the hands and feet

### Requirement: Bundle budget

The repository SHALL record size limits for the built game's JavaScript and CSS,
and for its model files, in a checked-in budget file, and SHALL provide a check
that measures the built assets, prints each measured size against its limit, and
exits non-zero when any limit is exceeded or when no build output exists. The
soldier model SHALL have a limit of at most 1.5 MB.

#### Scenario: Build within budget

- **WHEN** the bundle check runs after a build whose assets are within the limits
- **THEN** it prints each size against its limit and exits zero

#### Scenario: Build over budget

- **WHEN** the built JavaScript exceeds its limit
- **THEN** the check exits non-zero and names the asset group, its size and the limit

#### Scenario: Soldier model over budget

- **WHEN** the built `soldier.glb` is larger than its limit
- **THEN** the check exits non-zero and names the model, its size and the limit

#### Scenario: Missing build

- **WHEN** the bundle check runs with no build output
- **THEN** it exits non-zero and says the build must run first

## ADDED Requirements

### Requirement: Soldier fetched before the battle

When a battle is chosen the game SHALL start fetching the soldier model and
its uniform textures before the battle starts (from the briefing or the
deploy desk), and the battle loading screen SHALL count them in its
progress. Within one page session the soldier SHALL be fetched at most
once, whatever number of battles is played.

#### Scenario: Prefetch on briefing
- **WHEN** the player opens a chapter's briefing
- **THEN** the soldier model request starts before the player presses start

#### Scenario: Second battle does not refetch
- **WHEN** the player finishes a battle and starts another in the same page session
- **THEN** no new request for the soldier model is made
