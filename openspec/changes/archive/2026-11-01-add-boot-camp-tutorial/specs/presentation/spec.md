## ADDED Requirements

### Requirement: Boot Camp entry and tutorial shell

The start screen SHALL expose a Boot Camp action separate from the sandbox and
the normal start action. During the boot camp, the HUD SHALL show the active
chapter, objective, hint, checkpoint state and completion feedback.

#### Scenario: Start screen offers boot camp
- **WHEN** the start screen is shown
- **THEN** it offers a localized Boot Camp action without replacing the existing
  start, language and codex actions

#### Scenario: Tutorial HUD is active
- **WHEN** a boot camp chapter is playing
- **THEN** the HUD shows the chapter, objective, hint and checkpoint status

#### Scenario: Normal HUD is unchanged
- **WHEN** the normal skirmish is played
- **THEN** the tutorial panel is absent and the existing orders HUD remains
  available

#### Scenario: Feedback resolves through locales
- **WHEN** the active locale changes
- **THEN** boot camp labels and feedback update without reloading the scene
