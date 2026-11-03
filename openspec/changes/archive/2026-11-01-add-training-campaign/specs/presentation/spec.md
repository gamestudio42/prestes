## ADDED Requirements

### Requirement: Training campaign screen

The start screen SHALL expose a Campanha de Treinamento action that opens the
campaign overview. The overview and briefing SHALL use the shared command-HUD
visual tokens, rounded translucent panels, display/Barlow typography and localized
labels, without a second visual system.

#### Scenario: Campaign entry

- **WHEN** the player activates Campanha de Treinamento
- **THEN** the campaign overview opens with the map, legend, progress and missions

#### Scenario: Visual consistency

- **WHEN** the campaign screen and the in-game HUD are compared
- **THEN** panel, border, typography, icon and accent tokens match

#### Scenario: Briefing transition

- **WHEN** the player starts a playable mission
- **THEN** the briefing closes and the field opens with the mission panel
