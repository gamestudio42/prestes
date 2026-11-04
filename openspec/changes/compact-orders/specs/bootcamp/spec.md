## MODIFIED Requirements

### Requirement: Mechanic objectives per station

Each station SHALL gate progress on objectives that are verified from simulation
frames and events, not on button presses alone. The stations SHALL require:

- station 1: select the section, box-select, move to a zone, change formation,
  change stance and reach the assembly zone with five soldiers;
- station 2: attack a training target until it is hit, suppress a training troop
  for the configured duration, hold fire (fire control) while a target is
  visible, and face a marked direction with a drag;
- station 3: flank a suppressed training troop so that flankers reach its side,
  advance by bounds to a marked line, and withdraw out of a marked danger zone;
- station 4: defend a marked area with soldiers in cover, spring an ambush with
  fire control on contact when a training troop enters the zone, and halt under
  training fire for the configured duration;
- station 5: obtain a recon report from a marked area, attack a withdrawing
  training target and follow it, open the section to more than 5 m between
  soldiers in a marked area, keep part of the section defending with fire held,
  and close the section to under 2 m within the cohesion band;
- station 6: rescue an incapacitated soldier through carry, treatment and
  evacuation, keep the section within 10 m of the instructor while he is under
  fire, and keep cohesion while the instructor is out of action;
- station 7: suppress, take and hold the training line with the instructor
  protected, as in the former assault and hold phases.

#### Scenario: Effect, not click

- **WHEN** the player activates an order button but the ordered effect does not
  happen (for example no flanker reaches the target's side)
- **THEN** the objective does not complete

#### Scenario: Curriculum coverage

- **WHEN** the player completes the exercise
- **THEN** every order of the board, every stance, every posture, formation
  change, the facing and spacing drag, every fire control setting, bounding,
  rescue and the officer aura and loss have been required by at least one
  objective
