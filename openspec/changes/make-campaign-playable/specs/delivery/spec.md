## ADDED Requirements

### Requirement: Accepting a hand edit to an authored map

The repository SHALL provide one command that accepts a deliberate edit to
an authored map: `pnpm maps:accept <map-id> --reason "<why>"`.

It SHALL first run the map check on that map, and SHALL stop with the
check's problems when the check fails. It SHALL then re-record only that
map's determinism goldens. It SHALL store the reason with them and print the
old and new hashes. Last, it SHALL redraw that map's preview image.

It SHALL refuse:

- an unknown map id;
- a missing reason;
- a run whose two in-process battles differ (nondeterminism), which it
  reports as such.

Goldens of other maps SHALL stay untouched. The determinism check without
the update flag SHALL still never change a golden value.

#### Scenario: An edited campaign map is accepted

- **WHEN** the owner saves an edited Serra Nova map and runs `pnpm maps:accept serra-nova --reason "moved the chapel"`
- **THEN** the map check passes, only Serra Nova's goldens change and record the reason, its preview is redrawn, and `pnpm check:determinism` then passes

#### Scenario: A broken map is not accepted

- **WHEN** the edited map fails the map check
- **THEN** the command stops, lists the problems, and no golden changes

#### Scenario: A reason is required

- **WHEN** the command runs without `--reason`
- **THEN** it exits non-zero and changes nothing
