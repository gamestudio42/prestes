## MODIFIED Requirements

### Requirement: Fire control

A section SHALL have one fire control setting: free fire, economical fire,
on contact, or hold fire. On contact SHALL hold fire until an enemy is
within 25 m of any of its soldiers or the section is fired upon, then switch
the section to free fire.

Under economical fire a soldier SHALL open fire only at an enemy within
60 % of his weapon's range; SHALL wait at least one and a half times his
weapon's usual interval between aimed shots, with a hit chance 15 % higher
than the same shot under free fire; and SHALL fire automatic bursts of no
more than the low end of his weapon's burst. Economical fire SHALL be
available at every difficulty level and to both sides, and the enemy
commander SHALL NOT choose it. Explicit fire orders (area fire, suppress)
SHALL fire as ordered under economical fire, and the setting SHALL still be
economical when the order ends. The order board's Fire row SHALL show the
economical setting as its own button with its own icon slice and a
localized label and tooltip in PT-BR ("Econômico") and EN ("Economical").

Changing a section's fire control SHALL be spoken like an order of the
order board: the commander speaks a line for the new setting and the
section answers, with at least three takes of each for each of the four
settings, under the same rules as order lines (one line for several
sections, no take twice in a row, a newer line replaces one not started,
nothing spoken when the change is refused, captions in PT-BR and EN). The
economical setting's lines SHALL include "Só atirem quando virem o branco
dos olhos deles!" (EN caption "Don't fire until you see the whites of their
eyes!"). The caption SHALL be shown every time, whether the line is recorded
or not (the owner, 2026-11-15: the caption stays after the lines are
recorded); a setting whose lines are not yet recorded SHALL show its caption
and stay silent.

#### Scenario: Contact opens fire
- **WHEN** a section on contact sees an enemy at 60 m and later at 20 m
- **THEN** it does not fire at 60 m and opens fire at 20 m

#### Scenario: Economical fire waits for range
- **WHEN** a Mauser section of range 120 m under economical fire sees an enemy at 90 m and later at 70 m
- **THEN** it does not fire at 90 m and opens fire at 70 m

#### Scenario: Economical fire spends less
- **WHEN** two identical sections fire at the same enemy for 60 seconds, one under free fire and one under economical fire
- **THEN** the economical section has fired fewer rounds

#### Scenario: Short bursts
- **WHEN** an automatic rifle with bursts of 3 to 5 rounds fires under economical fire
- **THEN** every burst is 3 rounds or fewer

#### Scenario: Area fire under economical fire
- **WHEN** the section's fire control is economical and the player orders Area fire
- **THEN** the section fires into the area as ordered and its fire control is still economical when the order ends

#### Scenario: Fire control is spoken
- **WHEN** the player sets a section to economical fire
- **THEN** the commander speaks one of the economical takes, the section answers, and both are captioned

#### Scenario: Several sections, one line
- **WHEN** the player sets three sections to hold fire at once
- **THEN** the hold-fire line is spoken once and answered by one section

#### Scenario: Caption with a recorded line
- **WHEN** the player sets a section to hold fire and its takes are recorded
- **THEN** the line plays and its caption is shown with it

#### Scenario: Not yet recorded
- **WHEN** the player sets a section to free fire and its takes are not recorded
- **THEN** the caption is shown and no sound plays

#### Scenario: Economical fire is deterministic
- **WHEN** the same battle with a section under economical fire is run twice from the same seed and commands
- **THEN** the state hash is the same at every tick
