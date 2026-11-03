## ADDED Requirements

### Requirement: Defensive formation facing

A defend or ambush order SHALL orient its line perpendicular to the threat
direction at the picked point, keep cover candidates on the picked side of a
blocking cover, assign distinct cover destinations per soldier, and face the
nearest threat after arrival when no target or path overrides it.

#### Scenario: Defend behind a wall

- **WHEN** the player orders a section to defend on the near side of a wall
- **THEN** every soldier's destination stays on that side and the line faces the
  threat

#### Scenario: No cover stacking

- **WHEN** several soldiers can reach the same cover candidate
- **THEN** only one uses it and the others use distinct slots or other cover

#### Scenario: Defensive facing

- **WHEN** a defending or ambushing soldier has no target and no path
- **THEN** its facing points at the nearest threat, matching its aim and cone
