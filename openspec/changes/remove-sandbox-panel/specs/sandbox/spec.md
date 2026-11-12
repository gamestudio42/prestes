## MODIFIED Requirements

### Requirement: Both-sides control

In development builds the test bridge SHALL let a test control both
factions, so either section can be selected and given orders; the published
game SHALL NOT offer it.

#### Scenario: Select the legalist squad
- **WHEN** a test enables both-sides control through the development test bridge
- **THEN** the legalist section card appears and can be selected

#### Scenario: Order the legalist squad
- **WHEN** the legalist squad is selected
- **THEN** movement, formation, stance and tactical orders apply to its units

### Requirement: Combat demonstration test

The browser suite SHALL run a two-sided scenario, set up through the
development test bridge, that reinforces both sides, exercises the
implemented orders and records a video.

#### Scenario: Both-sides browser run
- **WHEN** the test controls both factions and steps the simulation
- **THEN** every issued command is accepted, the tick advances and a video is
  written to the test results

## REMOVED Requirements

### Requirement: Sandbox panel

**Reason**: The F1 panel and its HUD button are retired; the map editor builds test situations.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Unit inspector

**Reason**: The inspector lived in the panel; the same values are in the troop panel and, for tests, in the frame read through the development test bridge.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Pause and step

**Reason**: Pause stays in the top bar; single-tick stepping stays for tests through the development test bridge (`step`).

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Reset sandbox

**Reason**: Without the panel there is nothing to reset; a new battle starts from the skirmish setup or the editor's playtest.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Spawn cover

**Reason**: Placing cover by hand in a running battle is the editor's job now; the simulation's spawn commands stay for tests ("Sandbox spawn commands" in `simulation`).

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Localized sandbox UI

**Reason**: No sandbox UI is left to localize.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Whole-troop sandbox insertion

**Reason**: A panel tool; troops are placed in the editor and through the roster.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Universal placement preview

**Reason**: A panel tool; the editor has its own placement preview.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Continuous placement rotation

**Reason**: A panel tool.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

### Requirement: Real rotated placement

**Reason**: A panel tool; rotated objects are placed in the editor.

**Migration**: None for players; tests use the development test bridge (`window.__prestes`).

