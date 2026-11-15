# battle-events Specification

## Purpose
Lets the map author plan what happens during a battle (troops arriving, the
enemy pressing or falling back, a narrative card) so each mission's story
can be told from its map, deterministically.

## Requirements

### Requirement: Events on a battle map

A battle map SHALL be able to carry up to 24 events. Each event SHALL have
an id unique in the map, an author's label (editor only, not shown to the
player), exactly one trigger, a delay of 0 to 600 seconds, and one to four
actions. An event SHALL fire at most once per battle: its actions SHALL run
when its delay has passed after its trigger was met. A map without events
SHALL play exactly as before.

#### Scenario: A map without events
- **WHEN** a map with no events is played with a given seed and commands
- **THEN** the battle and its state hash are the same as before this change

#### Scenario: Delay
- **WHEN** an event triggered at 5:00 has a delay of 30 s
- **THEN** its actions run at 5:30 of the battle clock and not before

#### Scenario: Fires once
- **WHEN** an event triggered by "column fit soldiers in the area" has fired and the column leaves and re-enters the area
- **THEN** the event does not fire again

### Requirement: Event places

A battle map SHALL be able to carry named event places, of two kinds: an
entry point (a point within 10 m of the map edge, with an inward facing)
and a trigger area (a polygon of 3 to 16 corners). Events SHALL refer to
places by id, and several events SHALL be able to share a place. Place
names SHALL be the author's labels and SHALL NOT be shown to the player.

#### Scenario: Two waves on one road
- **WHEN** two events both bring enemy troops through the entry point "estrada de Taiobeiras"
- **THEN** both waves enter at that point

### Requirement: Triggers

An event's trigger SHALL be one of:
- **time**: the battle clock reaches a time (from 0:00 to the battle's time
  limit);
- **objective**: an objective is taken by a given side, or lost by a given
  side;
- **area**: at least one fit soldier of a given side is inside a trigger
  area;
- **losses**: a side's soldiers who are dead, incapacitated or routed reach
  a share (10 % to 90 %, in steps of 5 %) of all the men that side has
  fielded so far, reinforcements included;
- **after event**: another event of the map has fired.
Fit soldiers SHALL be counted as for objective capture. Triggers SHALL be checked
against the simulation's own state, not against what either side sees.
Triggers SHALL be checked only after the deployment phase ends, and the
battle clock for time triggers SHALL start when it ends.

#### Scenario: Objective taken
- **WHEN** an event's trigger is "the legalists take the bridge" and a legalist section captures the bridge
- **THEN** the event fires on that tick (plus its delay)

#### Scenario: Area entered unseen
- **WHEN** a column section hidden from every legalist enters a trigger area set for the column
- **THEN** the event fires although no legalist sees the section

#### Scenario: Losses with reinforcements
- **WHEN** the legalists fielded 30 men, received 10 by an event, and 20 are dead, incapacitated or routed, and an event waits for legalist losses of 50 %
- **THEN** the event fires (20 of 40)

#### Scenario: Chain
- **WHEN** event B is "after event A" with a delay of 600 s and A fires at 4:00
- **THEN** B's actions run at 14:00

#### Scenario: Not during deployment
- **WHEN** an event's trigger is "time 0:00"
- **THEN** it fires on the first tick after the deployment phase ends

### Requirement: Troops enter

The action "troops enter" SHALL bring one to six sections of one side onto
the map at an entry point. Each section SHALL be a section type of that
side's armies (the Column's for the column; the legalist regulars' or the
patriotic battalions' for the legalists), with its men, weapons and
uniform. The sections SHALL appear in file just inside the map at the
entry point, facing inward, one section every 5 seconds in the listed
order, so they do not stack. The skirmish roster limits SHALL NOT apply to
them. The action SHALL carry a first order:
- for the column: move to a point, or stay at the entry; the sections then
  come under the player's command and appear in the troop panel like the
  others;
- for the legalists: move to a point, go for a named objective, or join
  the commander's plan; after the first order they come under the enemy
  commander.
Arriving sections SHALL obey fog of war: the player SHALL see enemy
arrivals only when a column soldier sees them.

#### Scenario: Patriotic battalions arrive
- **WHEN** an event brings two patriotic battalion sections through an entry point with the order "go for the church"
- **THEN** two sections in the battalions' uniform enter there 5 s apart and move toward the church objective, and the commander uses them afterwards

#### Scenario: The rearguard arrives
- **WHEN** an event brings one Column rifle section with the order "move to the ford"
- **THEN** the section enters, walks to the ford, and appears in the player's troop panel where the player can order it

#### Scenario: Unseen arrival
- **WHEN** a legalist section enters at an entry point no column soldier can see
- **THEN** the section is not drawn for the player

### Requirement: Enemy posture

The action "enemy posture" SHALL set the enemy commander's posture to one
of:
- **general offensive**: every legalist section that is not routed is sent
  to attack, toward the objective of most value it does not hold (nearest
  first on ties) or, when it holds them all, toward the nearest known
  column soldiers;
- **fall back**: every legalist section that is not routed moves to a
  trigger area named by the action, or to its own deployment area when none
  is named, and holds there;
- **hold**: every legalist section stops advancing and defends where it
  stands.
The posture SHALL last a set time (30 s to 20 min) or until a named event
fires, and the commander SHALL then return to its normal plan. A later
posture action SHALL replace an earlier one. Routed sections SHALL keep
routing under any posture. The action SHALL have no effect on the column.

#### Scenario: The push after the bridge
- **WHEN** a "general offensive for 5 min" fires with four legalist sections fit
- **THEN** within 10 s all four are ordered to attack, and after 5 min the commander again keeps guards on its objectives

#### Scenario: Fall back until relieved
- **WHEN** a "fall back to area 'morro' until event 'reforços'" fires, and 'reforços' fires 3 min later
- **THEN** the legalist sections move to the area and hold, and resume the normal plan when 'reforços' fires

#### Scenario: Routed stay routed
- **WHEN** a general offensive fires while one legalist section is routed
- **THEN** that section keeps fleeing

### Requirement: Narrative card

The action "narrative card" SHALL show the player a book-style card with a
title and a text, both authored in PT-BR and EN and shown in the game's
language. While the card is open the battle SHALL be paused (the
simulation does not advance); closing it SHALL resume the battle at the
speed it had. When several cards are due on the same tick they SHALL be
shown one after the other in event order. In a run without a player (the
headless run, the determinism check) cards SHALL NOT pause anything.

#### Scenario: The story speaks
- **WHEN** an event with a card "Chegam os batalhões patrióticos" fires while the game is in PT-BR at speed 2
- **THEN** the battle pauses, the card shows the PT-BR title and text, and on closing the battle resumes at speed 2

#### Scenario: Language
- **WHEN** the same card fires with the game in EN
- **THEN** the EN title and text are shown

#### Scenario: Headless
- **WHEN** a map with cards runs in the headless simulation
- **THEN** the run completes without waiting and its hash matches the interactive run with the same seed and commands

### Requirement: Events are deterministic

Events SHALL be evaluated in the simulation on the fixed tick, after
objectives and casualties are updated, in ascending event id. Which events
have been triggered and fired, and on which tick, SHALL be part of the
hashed state. Arriving sections SHALL take unit and section ids in the
order they appear. The same map, seed and commands SHALL give the same
events on the same ticks.

#### Scenario: Same battle twice
- **WHEN** a map with a time trigger, an objective trigger and a chain runs twice with the same seed and commands
- **THEN** the events fire on the same ticks and the state hashes match on every tick

### Requirement: Event announcements

When an event fires, the simulation SHALL emit an event naming it, so the
presentation can react (the card, and the troop panel for column
arrivals). Events that bring legalist troops or change the enemy posture
SHALL NOT be announced to the player unless the event also has a card.

#### Scenario: Silent push
- **WHEN** an event with only "general offensive" fires
- **THEN** no message is shown to the player; the player learns of it by what the enemy does
