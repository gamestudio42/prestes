## MODIFIED Requirements

### Requirement: Mixed-force deployment

Each side's sections SHALL deploy across its map's deployment zone in roster
order: the zone's three section starts first, further sections between and
behind them, every soldier on walkable ground. These are the starting
places; a deployment phase may rearrange them. Each section SHALL be one
selectable troop with its own card. When the enemy is left at "Sorteado",
it SHALL field a roster drawn from preset forces for the map, chosen by the
battle seed, so the same seed fields the same enemy.

#### Scenario: Six small sections deploy
- **WHEN** a roster of six sections starts on the test map (`campo-de-provas`)
- **THEN** every soldier stands on walkable ground in the column's zone and six troop cards are shown

#### Scenario: Enemy roster is deterministic
- **WHEN** two battles start with the same seed and map, the enemy left at "Sorteado"
- **THEN** the enemy fields the same sections in the same places
