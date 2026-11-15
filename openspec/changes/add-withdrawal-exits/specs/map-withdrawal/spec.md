## Purpose

Lets a battle map end in a fighting retreat or a breakout: the column wins by
getting a required part of its force off the field through the map's exits,
and the men who got out are counted as saved, not lost or broken.

## ADDED Requirements

### Requirement: Exits and the withdrawal requirement on a map

A battle map MAY define a withdrawal: one to four **exits** and one
**requirement**. Each exit SHALL have an id, a localized name (PT-BR and EN)
and an area (a polygon of 3 to 16 corners). The requirement SHALL be a number
of column sections from 1 to the number of sections the column fields at the
start, and a flag saying whether the column's command section SHALL be one of
the sections that get out. Exits SHALL be for the column only. A map without a
withdrawal SHALL play exactly as before this capability. The withdrawal SHALL
be data shared by the simulation and the view.

Historical note: the rule serves the column's breakouts and fighting
withdrawals, among them the crossing of the Uruguay out of the Iron Ring
(Macaulay 1974, ch. II, pp. 43-48), the Verdinho bridge (Macaulay 1974,
pp. 122-124), the rearguard at Serra Nova (Macaulay 1974, ch. VIII,
pp. 220-221) and the crossing into Bolivia at La Gaiba (Macaulay 1974, ch. IX,
pp. 230-234). All four missions are commanded by Luís Carlos Prestes, chief
of staff, from the column's perspective (`docs/campaign/missions/`); the rule
itself names no figure.

#### Scenario: A map without exits
- **WHEN** a map with no withdrawal is played with the same seed and commands as before this capability
- **THEN** its outcome and its determinism hash are unchanged

#### Scenario: Requirement read from the map
- **WHEN** a map's withdrawal has two exits and requires 2 sections including the command section
- **THEN** the battle shows both exits and the requirement "2 sections, the command section among them"

### Requirement: Leaving the field

During the battle (not during the deployment phase), a fit column soldier
standing inside an exit area SHALL leave the field on that tick: he SHALL no
longer be on the map, SHALL NOT be seen, targeted, hit or counted for
objective capture or triggers, and SHALL NOT come back. Routed,
incapacitated and dead soldiers SHALL NOT leave by an exit. A column section
SHALL have **got out** on the first tick when at least one of its men has
left by an exit and none of its men is still fit on the field; the command
section is the column's section of the command limit group. Each man leaving
and each section getting out SHALL be reported as an event with the exit's
id. Leaving SHALL be deterministic.

#### Scenario: A section walks out
- **WHEN** a column section of 6 fit men is ordered to move into an exit and all 6 enter it
- **THEN** each man leaves on the tick he enters, and the section has got out when the sixth leaves

#### Scenario: Wounded left behind
- **WHEN** a section has 4 fit men and 2 incapacitated men and the 4 fit men leave by an exit
- **THEN** the section has got out, 4 men are saved and the 2 incapacitated men stay on the field as losses

#### Scenario: Routed men do not get out
- **WHEN** a routed column soldier runs through an exit area
- **THEN** he does not leave the field and is counted as routed

#### Scenario: Not during deployment
- **WHEN** the deployment phase is on and a column section stands inside an exit
- **THEN** no man leaves; the first men leave on the first tick after the phase ends

### Requirement: Victory and defeat by withdrawal

On a map with a withdrawal, the battle SHALL end in victory, decided by
withdrawal, on the tick the requirement is met (enough sections have got out,
and the command section among them when the requirement says so). It SHALL
end in defeat, decided as "cut off", when the time limit is reached, or when
no column soldier is fit on the field, without the requirement met. The
column's objective victories (holding every objective for 2 minutes, more
value at the time limit) SHALL NOT apply on such a map; the legalists holding
every objective for 2 minutes SHALL still be a defeat, and the legalists
breaking or having no fit soldier SHALL still be a victory. Men who got out
SHALL count as fit column men for the rule that makes a side fall back off
the field. When several endings happen on the same tick, a met requirement
SHALL win over every other ending.

#### Scenario: Requirement met
- **WHEN** the requirement is 2 sections and a second column section gets out while the rest of the column is still fighting
- **THEN** the battle ends in victory on that tick and the end panel says it was decided by withdrawal

#### Scenario: Command section required
- **WHEN** the requirement is 1 section with the command section, and a rifle section gets out but the command section is still on the field
- **THEN** the battle goes on, and ends in victory when the command section gets out

#### Scenario: Cut off by the clock
- **WHEN** the time limit is reached and only 1 of 2 required sections has got out
- **THEN** the battle ends in defeat and the end panel says the column was cut off

#### Scenario: Last men out short of the requirement
- **WHEN** the requirement is 3 sections, 2 have got out and the third section's men are all dead or incapacitated
- **THEN** the battle ends in defeat, cut off

#### Scenario: Most of the column out is not broken
- **WHEN** 80 % of the column's starting men have got out and the remaining fit men on the field have had no contact for 60 s
- **THEN** the column does not fall back and the battle is not decided by a broken column

#### Scenario: Holding the objectives does not win a breakout
- **WHEN** on a map with a withdrawal and objectives the column holds every objective for 2 minutes
- **THEN** the battle does not end by objectives

### Requirement: Men who got out in the report

The battle's outcome record SHALL carry, for a map with a withdrawal, the
number of column men who got out, the number of sections that got out and
the number of sections the column fielded. The end panel SHALL show the men
who got out next to each side's losses (dead, wounded, routed) and the
sections that got out against the requirement, whatever the result, under
the map's epilogue. All labels SHALL be localized in EN and PT-BR.

#### Scenario: Victory with losses
- **WHEN** the column wins by withdrawal with 31 men out, 2 of 3 sections out against a requirement of 2, and 9 dead
- **THEN** the end panel shows "Saíram 31 homens · seções fora 2 de 3 (exigidas 2)" in PT-BR, and "31 men got out · sections out 2 of 3 (2 required)" in EN, beside the losses table

#### Scenario: Cut off still counts the saved
- **WHEN** the column is cut off with 12 men out
- **THEN** the end panel shows the defeat and that 12 men got out

### Requirement: Exits on the field and progress in the HUD

On a map with a withdrawal, the battle view SHALL draw each exit on the
ground, labelled with its localized name, during the deployment phase and
the battle, and SHALL NOT draw men who left the field. The HUD SHALL show
the requirement's progress: sections out against the number required and,
when the requirement names it, whether the command section is out. When a
section gets out, the HUD SHALL announce it with the exit's name. All labels
SHALL be localized in EN and PT-BR.

#### Scenario: Progress shown
- **WHEN** the requirement is 2 sections with the command section and one rifle section has got out
- **THEN** the HUD shows "Seções fora 1/2 · comando: não" in PT-BR and "Sections out 1/2 · command: no" in EN

#### Scenario: Announcement
- **WHEN** the command section gets out by the exit "Passo do Uruguai"
- **THEN** the HUD announces that the command section got out by "Passo do Uruguai"

### Requirement: The enemy commander cuts the exits

On a map with a withdrawal, the enemy commander SHALL know the exits (a fact
of the map, like the deployment areas). From the start of the battle it SHALL
keep one section (two when it has four or more sections) blocking the route
between the column's deployment area and the exit nearest to it, and SHALL
send its attacking sections toward a column section it knows to be within
60 m of an exit, using only what its side knows. These rules SHALL take
precedence over guarding objectives. While a battle event's enemy posture
lasts, the posture SHALL replace these rules; when it ends, they SHALL apply
again from the state the battle is in. The commander SHALL act only through
the ordinary commands.

#### Scenario: Blocking section at the start
- **WHEN** a battle on a map with one exit starts and the legalists field three sections
- **THEN** within the first 30 s of the battle one legalist section is ordered to a point on the route between the column's deployment area and that exit

#### Scenario: Turning on a column near the exit
- **WHEN** a legalist sees a column section 40 m from an exit
- **THEN** within 10 s the commander's attacking sections are ordered toward that column section

#### Scenario: Unseen column is not chased
- **WHEN** fog of war is on and a column section reaches an exit unseen by any legalist
- **THEN** no attacking section is turned toward it

#### Scenario: Posture overrides the block
- **WHEN** a "hold" posture is in force at the battle's start
- **THEN** no section is sent to block the exit until the posture ends

### Requirement: Withdrawal is deterministic

Leaving the field, sections getting out, the requirement, the outcome and the
commander's cut-exit orders SHALL depend only on the map, the seed and the
commands, SHALL be part of the simulation's hashed state, and the same map,
seed and commands SHALL give the same hash on every run.

#### Scenario: Replay
- **WHEN** a test fixture map with two exits is played twice with the same seed and commands
- **THEN** the same men leave on the same ticks, the outcome is the same and the hashes match the golden
