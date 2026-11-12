## MODIFIED Requirements

### Requirement: Where fog of war applies

Fog of war SHALL be on in the 3 vs 3 battle and off in the bootcamp. In
development builds the test bridge SHALL turn fog of war off and on, and it
SHALL be off while a test controls both sides; the published game SHALL NOT
offer a toggle.

#### Scenario: Bootcamp shows all
- **WHEN** a bootcamp station runs
- **THEN** every training enemy is drawn as before

#### Scenario: Sandbox toggle
- **WHEN** a test turns fog of war on through the development test bridge
- **THEN** unseen legalists stop being drawn
