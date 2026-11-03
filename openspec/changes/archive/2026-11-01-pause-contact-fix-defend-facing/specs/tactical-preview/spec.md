## ADDED Requirements

### Requirement: Defend preview keeps the ordered side

A defend preview SHALL use the threat axis for its formation, reject cover on the
far side of a blocking cover, reserve distinct cover destinations and point each
preview cone at the threat.

#### Scenario: Preview behind a wall

- **WHEN** the player previews a defend order on the near side of a wall
- **THEN** every ghost destination stays on that side and the cones face the threat

#### Scenario: Preview matches committed side

- **WHEN** the player commits the previewed defend order
- **THEN** the simulation uses the same side and formation axis
