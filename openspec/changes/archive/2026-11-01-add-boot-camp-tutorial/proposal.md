## Why

The combat prototype now contains selection, formations, tactical orders,
suppression, morale, cover, casualties, rescue, recovery and two-sided sandbox
control, but there is no guided scenario that teaches them in order or proves the
whole set is playable. A boot camp gives the player a safe place to learn the
verbs and gives the project one end-to-end acceptance map for every implemented
combat mechanic.

## What Changes

- Add a fictional **Campo de Instrução** training map, separate from historical
  campaign missions.
- Split the map into **six chapters with checkpoints**:
  1. camera, selection and stance;
  2. movement, terrain, cover and formations;
  3. fire, ammunition, suppression, morale and flanking;
  4. tactical orders with real opposition;
  5. casualties, rescue queue and recovery;
  6. free play with both-sides control and sandbox tools.
- Use **training targets and scripted dummies** through chapter 3; introduce a
  real opposing force in chapter 4.
- Enable **both-sides control only in chapter 6**.
- Add a tutorial director that observes frame/events, advances objectives,
  validates each required action, stores chapter checkpoints and emits localized
  feedback.
- Expose **Boot Camp** from the start screen; keep the existing sandbox available
  for debugging.
- Record completion/checkpoint state locally; full campaign save is out of scope.
- Add browser acceptance coverage for completing the chapters and a video run.

## Capabilities

### New Capabilities
- `boot-camp`: training-ground map, chapter flow, tutorial triggers, checkpoints,
  training targets, scripted opposition and free-play graduation.

### Modified Capabilities
- `presentation`: the start screen exposes the Boot Camp entry and the HUD hosts
  the tutorial objective/checkpoint feedback.

## Impact

- New content data for the training map, chapter steps, spawn schedules and
  localized tutorial copy.
- New presentation layer for the tutorial director, objective panel and checkpoint
  controls, driven by the read-only client frame and simulation events.
- Reuses the existing simulation commands, terrain/cover data, character proxies,
  sandbox both-sides mode, casualty drill and roster foundations.
- Adds unit, content and Playwright coverage; no new Three.js or simulation
  dependency is introduced.
- The training map is fictional and must not be presented as a historical battle.
