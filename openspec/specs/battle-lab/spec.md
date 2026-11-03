# battle-lab Specification

## Purpose
Defines the large-battle sandbox: 3v3 troops of eleven, 120 m rifle and vision range, all-unit LOS cone acquisition, gradual threat scanning and performance requirements for 66 soldiers.

## Requirements

### Requirement: Large battle laboratory

The sandbox SHALL start a 3v3 battle with three player troops and three enemy troops of 11 soldiers each, for 66 units total. Each troop SHALL be selectable by clicking any of its soldiers.

#### Scenario: Start 3v3
- **WHEN** the player starts the 3v3 battle in the sandbox
- **THEN** 66 units are created in six squads and each side has three troops

### Requirement: Long-range vision and rifle

The Mauser SHALL have a 120 m range. Every unit SHALL use a forward cone with range, line-of-sight and cover blocking for target acquisition. Idle units SHALL scan gradually toward nearby threats, while acquisition still requires the target inside the cone and LOS.

#### Scenario: Target inside cone
- **WHEN** an enemy is within range, inside the forward cone and has clear LOS
- **THEN** the unit can acquire and fire at it

#### Scenario: Target outside cone
- **WHEN** an enemy is outside the cone and the unit has not turned
- **THEN** the unit does not acquire it

### Requirement: Large-battle performance

Vision rendering SHALL use batched line geometry. Large unit counts SHALL use instanced character proxies at strategic zoom. Target acquisition SHALL avoid repeated O(n) ally scans per candidate. The 3v3 scenario SHALL have a deterministic headless benchmark.

#### Scenario: Headless 3v3
- **WHEN** the 3v3 benchmark runs 1,000 ticks
- **THEN** it reports tick time and a stable hash without freezing

### Requirement: AI, cover and obstacles

The 3v3 enemy troops SHALL acquire targets, use formation movement, seek cover and path around obstacles.

#### Scenario: Engagement
- **WHEN** the battle runs for several minutes
- **THEN** units acquire targets, move, occupy cover and engage without all remaining stationary
