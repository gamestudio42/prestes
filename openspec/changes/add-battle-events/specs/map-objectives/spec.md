## MODIFIED Requirements

### Requirement: The commander plays the objectives

The enemy commander SHALL keep at least one section on or near each of its
objectives of value 2 or more, SHALL send its attacking sections toward the
objective of most value that it does not hold (nearest first on ties), and
SHALL send a section to retake an objective it loses, using only what its
side knows. When the clock leaves less than 3 minutes and it holds less
value, it SHALL commit all but one section to attack. While a battle
event's enemy posture lasts (general offensive, fall back or hold), the
posture SHALL replace these rules; when it ends, these rules SHALL apply
again from the state the battle is in.

#### Scenario: Retake
- **WHEN** the player takes a legalist-held objective of value 2
- **THEN** within 60 s a legalist section is ordered toward it

#### Scenario: Last minutes
- **WHEN** 2 minutes are left and the legalists hold less value
- **THEN** all but one legalist section are attacking

#### Scenario: Posture overrides the guards
- **WHEN** a "hold" posture is in force and the player takes a legalist-held objective of value 2
- **THEN** no legalist section is sent to retake it until the posture ends, and within 60 s after it ends one is
