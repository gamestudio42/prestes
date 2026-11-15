## MODIFIED Requirements

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
- **after event**: another event of the map has fired;
- **commander down**: the map's field commander is killed or incapacitated.
  The map check SHALL report this trigger on a map without a field
  commander.
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

#### Scenario: Commander down with a card
- **WHEN** on a map whose loss outcome is continue an event's trigger is "commander down" with a narrative card, and the figure is incapacitated
- **THEN** the event fires on that tick (plus its delay) and the card is shown

#### Scenario: Commander down on a map without one
- **WHEN** a map without a field commander has an event triggered by "commander down"
- **THEN** the map check reports the event
