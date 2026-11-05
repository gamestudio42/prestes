## MODIFIED Requirements

### Requirement: Pause and speed

The HUD SHALL pause the simulation and offer four speeds labelled 0.5x, 1x,
2x and 4x. 1x SHALL be real time, one 0.1 s tick per 100 ms interval; 0.5x
SHALL step one tick every other interval, and 2x and 4x two and four ticks
per interval. The game SHALL start at 1x, and starting, retrying or
continuing an exercise SHALL reset the speed to 1x.

#### Scenario: Pause stops ticks

- **WHEN** the player pauses
- **THEN** the simulation tick stops advancing until resumed

#### Scenario: Default speed

- **WHEN** the player starts or retries the bootcamp or the sandbox
- **THEN** the 1x speed is selected and the client requests one tick per
  100 ms interval

#### Scenario: Speed multiplies ticks

- **WHEN** the player selects 0.5x, 2x or 4x
- **THEN** the client requests on average one half, two or four ticks per
  100 ms interval

## ADDED Requirements

### Requirement: Legs follow the ground

Each movement clip SHALL declare the ground speed it was authored for (walk
1.5, walk-ready 1.4, run 3.5, crouch-walk 1.0, crawl 0.4 m/s). The view
SHALL choose the clip by the soldier's ground speed (idle below 0.2, walk
below 2.2, run above; crouched and prone keep their own clips) and play it
at the actual speed over the authored one, clamped to 0.75..1.25. Movement
clips SHALL cross-fade over about 0.3 s.

#### Scenario: A walking soldier
- **WHEN** a soldier on a move order walks at 1.5 m/s at 1x
- **THEN** he plays the walk clip at its authored rate

#### Scenario: A withdrawing soldier runs
- **WHEN** a section withdraws
- **THEN** its soldiers play the run clip

#### Scenario: No skating
- **WHEN** a soldier slows from a run to a stop
- **THEN** the clip changes from run to walk to idle with cross-fades, and
  no clip plays outside 0.75..1.25 of its rate

### Requirement: Smooth turning

The soldier's body SHALL turn toward his facing at up to about 270 degrees a
second, the shortest way round, rather than snapping.

#### Scenario: About face
- **WHEN** a halted soldier's facing turns 180 degrees in one tick
- **THEN** his body takes about two thirds of a second to turn round

### Requirement: Front mark

At tactical span the ring under each soldier SHALL carry a small arrowhead
on its edge pointing where he faces, turning with him, in the ring's colour.
The vision cone SHALL NOT be drawn; it is a mechanic only. The strategic
proxies SHALL keep the plain ring.

#### Scenario: Front at a glance
- **WHEN** a section faces north at tactical span
- **THEN** each soldier's ring mark points north and no cone is drawn

#### Scenario: Recon sweep shows
- **WHEN** a recon section sweeps
- **THEN** the marks swing left and right with the soldiers' facing
