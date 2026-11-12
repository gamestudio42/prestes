## MODIFIED Requirements

### Requirement: The test map

The project SHALL keep one test map: a map document laid out so the
systems can be checked in a short battle. Within the deployment areas'
reach it SHALL hold at least a house, a sobrado and a church with its
tower, a trench line, a walled yard, a stream with a ford, open ground
crossed by cover lines, and open room for objectives. It SHALL be listed
only in development builds, never in the
published skirmish list. The determinism goldens, the battle reports, the
benchmarks and the end-to-end suites SHALL run on it; it SHALL be editable
in the editor like any map.

#### Scenario: Not in the published game
- **WHEN** the published build's skirmish map fan opens
- **THEN** the test map is not among the maps

#### Scenario: Garrisons and a ford close at hand
- **WHEN** the 3 vs 3 starts on the test map
- **THEN** a house, a sobrado, the church tower, a trench line, a walled yard and the ford are each within 150 m of a column section

#### Scenario: Goldens on the test map
- **WHEN** the determinism check runs
- **THEN** its 3 vs 3 cases run on the test map and match the recorded goldens
