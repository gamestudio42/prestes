## ADDED Requirements

### Requirement: Battle HUD controls

The battle HUD SHALL let the player centre the view on the selected section: a
double-click on the Troop Summary SHALL focus the camera on the selected
section without changing the zoom band, and a double-click on a squad card
SHALL select that section and centre the view on it. The HUD SHALL offer a
control to leave the battle for the desk; it SHALL ask for confirmation before
leaving, and cancelling SHALL leave the battle unchanged. The battle HUD SHALL
NOT offer the codex; the menu's compendium book SHALL remain the only way to
read it. Every new label and confirmation text SHALL exist in PT-BR and EN.

#### Scenario: Double-click the Troop Summary
- **WHEN** the player double-clicks the Troop Summary
- **THEN** the camera moves to the selected section and keeps the current zoom band

#### Scenario: Double-click a squad card
- **WHEN** the player double-clicks a squad card
- **THEN** that section becomes selected and the camera centres on it

#### Scenario: Leaving asks first
- **WHEN** the player presses the leave control and confirms
- **THEN** the battle closes and the desk returns

#### Scenario: Cancelling keeps the battle
- **WHEN** the player presses the leave control and cancels
- **THEN** the battle continues unchanged

#### Scenario: No codex in battle
- **WHEN** the battle HUD is shown
- **THEN** no codex control or panel is offered, while the desk's compendium book still opens

#### Scenario: Labels in both languages
- **WHEN** the locale switches between EN and PT-BR
- **THEN** the centring, leave and confirmation labels follow it
