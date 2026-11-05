## Context

The 3v3 (`scenario: 'battle3v3'`) deploys `BATTLE_UNITS` (three column and
three legalist sections of 11) around y = +49 and y = -47, inside the Mauser's
120 m range. Combat (`systems/combat.ts`) fires whenever `cooldown` reaches
zero, with `fireIntervalTicks: 12` (1.2 s) and no acquisition delay, so a
section that acquires together fires together and keeps the same phase. Hit
chance is `accuracy x range x (1 - cover) x morale x ...`; cover (`coverAgainst`
in `shared/world.ts`) is the stance cover plus the best wall quality crossing
the line of fire, capped at 0.75, with no distance term. Damage is 18 to 30 of
100 health. The first time health reaches zero the soldier is incapacitated;
the next time he dies.

The legalist side has no commander: once deployed it only acquires targets
and reacts to fire. That is why the enemies hold `aim-crouch`. The clip choice
(`soldierClip`) is already shared by every faction; it shows an aiming clip
while the unit has a target, and an idle enemy always has one. Bounding
(`systems/bounding.ts`) sends the rushing team to cover within 16 m that is
closer to the objective, or else 2 to 8 m straight ahead. An `outcome` event
and `Frame.outcome` already exist. They count incapacitated legalists as out
but not incapacitated column soldiers, and only the sandbox panel shows them.

## Goals / Non-Goals

**Goals:** fire that ripples instead of volleys, decisive hits (2 to 3), close
assault that clears cover, rushes of a real length, an enemy that fights with
intent, a battle with a beginning and an end, and a measurable feel gate. The
simulation stays deterministic and free of Three.js, React, the DOM and Node
APIs. Commands and events remain the only boundary.

**Non-Goals:** new weapons or arms, a general strategic AI for campaign
missions, multiplayer, new maps or models, historical claims (no new source).

## Decisions

### Aimed interval and reaction delay in the weapon profile

`WeaponProfile` gains `aimedIntervalTicks: [30, 50]` and
`reactionTicks: [5, 25]` (widened from 5 to 15 in apply: eleven soldiers on
eleven possible delays collided into four-shot ticks at first contact) (the old `fireIntervalTicks` stays for suppressive
fire). When a unit fires, its cooldown is drawn from the seeded RNG within the
aimed range. When it acquires a new target while its cooldown is zero, the
cooldown is set to a reaction draw. Each draw uses the engine RNG in unit
order inside the tick, so the result is deterministic. This also breaks the
phase lock: two soldiers that acquire together draw different delays.

Rejected alternatives: a fixed per-unit offset (`id mod n`) still fires in
patterns; a section-level "fire on command" volley is the opposite of the
goal.

### Lethality

Damage moves to 35 to 55, so 2 hits put a soldier down at 55 + 55 or 45 + 55
and 3 hits at 35 x 3. The old rule (reaching zero health kills a soldier who
was already wounded) would now kill every casualty, because the first hit
always leaves a light wound, and rescue would lose its point. So the outcome
is drawn when health reaches zero: killed with probability 0.4, otherwise
incapacitated. A soldier already severely wounded dies. The light wound
penalties already in `casualties` apply after the first hit. The suppress-fire
damage halving stays.

Attackers had a second problem: a soldier under Attack whose objective was
out of sight held fire entirely, so a section waited on one hidden man while
others stood in the open. An attacker now keeps his objective (the bounds
still go for it) but fires at the nearest enemy of that side he can see,
looking again every 0.5 s when he sees none.

### Close-quarters cover fall-off

`coverAgainst` multiplies the wall term by `min(1, distance / 30)`, floored to
a third inside 10 m. When shooter and target both lie inside the same cover
volume, that volume's wall term is dropped. The stance term stays. The
function lives in `shared` and is pure, so the view's preview keeps matching
the simulation.

### Rush length

`assignBoundingAdvance` looks for cover up to 30 m ahead (was 16) and, with
none, rushes `clamp(remaining * 0.5, 12, 20)` m capped at the remaining
distance (was 2 to 8). The covering team's hold stays. Bound rushes still run
at 3.5 m/s, so a rush lasts 3.5 to 6 s.

### Enemy commander for the 3v3

`systems/enemy-commander.ts` runs every 10 ticks only in the 3v3 and issues
ordinary commands for the legalist sections, just as the player's HUD does,
so every behaviour goes through the existing order code:

- deploy: each section takes Defend on its own cover line in front of its
  start;
- hold while the player is out of range or in front;
- counterattack: when legalist fit soldiers are at least 1.4 times the
  column's and section morale is steady, the strongest section attacks by
  bounds on the nearest column section;
- withdraw a section that falls under 4 fit soldiers or is pinned for 15 s.

Its decisions come only from the frame state and the RNG, so it is
deterministic and shows in the golden.

### No stalemate: last known contact

Each unit records `lastContact` (position and tick) when it sees an enemy.
A fit unit with no current target for 100 ticks, not holding an ordered
position (defend, hold or ambush), moves toward its section's latest
`lastContact` at walk. If nobody has one, it moves toward the enemy side's
centroid at slow. This applies to both sides, which also gives the player's
idle soldiers some initiative.

### Battle end

`updateOutcome` counts incapacitated column soldiers as out, like the
legalists. The 3v3 end panel (`apps/game`, React HUD) appears on the
`outcome` event. It shows the result, the battle time (tick / 10) and each
side's dead, incapacitated and routed, with Restart (the existing 3v3 start)
and Menu. The strings go in both locales.

### Start menu and deployment

`BATTLE_UNITS` moves to y = +90 and y = -90 (about 180 m apart, inside the
±120 m map) and keeps its formations. The start menu gets a "3 vs 3 battle"
entry that calls the existing `handleStartBattle3v3`.

### Feel report

`tools/battle-report.ts` (`pnpm battle:report`) runs the 3v3 headless with a
fixed seed and the player's sections attacking by bounds on the nearest enemy
section, re-targeting as sections fall. It prints the battle time, shots per
casualty, the largest same-tick shot count and the longest silent stretch.
`tests/simulation/battle-feel.test.ts` runs the same script function and
asserts the bands from the spec. The numbers above are starting values. The
apply phase tunes them by the report and by watching the battle in the browser
(screenshots at tactical span), and records the final values in
`docs/status.md`.

### Simulation / presentation boundary

The only view changes are the start-menu entry, the end panel and the routes
filter (below). Clip choice is already shared. Once the enemy moves, crouches
and fires at a spread cadence, `soldierClip` shows walk, run, prone, fire and
aim for it. A view test pins this with a legalist snapshot through each state.
The path layer currently draws every player order. Per the existing "Movement
path visualization" requirement, it is limited to the selected sections. That
fixes the clutter seen in the battle and needs no spec change.

## Risks / Trade-offs

- Slower fire and longer rushes change the bootcamp's tuned stations (fire,
  maneuver, defense). Their e2e runs and the station objectives may need new
  timeouts or target counts. The training ground keeps the same weapon, so
  this is checked rather than avoided.
- The determinism golden changes on purpose. `check:determinism` must be
  re-recorded once, with the reason in `docs/status.md`.
- A scripted enemy commander can look mechanical. The thresholds are simple
  and visible in one file, so tuning is cheap.
- The feel bands are a proxy for fun. The user's hand check stays the final
  gate.

## Playtest findings (apply)

The battle report and traces of the headless battle turned up the following.
Each is in the code with a test.

- **Cover sampling missed parapets.** `segmentCrossesCover` tested 32 points
  along the line of fire. At 160 m they are 5 m apart, so a parapet 2 m in
  front of a soldier was skipped, and line of sight could pass through a
  thin wall. It is now an exact segment-against-rectangle clip. This affects
  every long-range shot, not only the 3v3.
- **Equal sides and trenches.** With cover counted properly, an attack on a
  dug-in section of equal size fails whatever the tactic. That is realistic,
  so the scenario was reshaped rather than the numbers. Each side gets a
  trench line (`BATTLE_COVERS`, short bays because a cover shelters only
  within its radius). The game loop the playtests found is: hold the line,
  break the enemy's attack, counterattack once ahead. The report plays that
  loop, and the player wins with 11 to 28 casualties of 33.
- **Commander tuning.** Feeding one section at a time made the defence too
  easy and left 60 s lulls. After 30 s without fire the commander now
  attacks with all but one section.
- **Ammunition.** 20 rounds last about 80 s of aimed fire, so every soldier
  ran dry mid-battle. The 3v3 issues the training load (weapons delta).
- **Morale.** It recovered only near an officer (none in the 3v3), so a man
  pinned by low morale stayed pinned with nobody shooting. Out of fire,
  morale now recovers 0.3 a second, up to 60.
- **Suppression.** Cover cut suppression as much as hits, and a suppressing
  section put every rifle on one man. Now cover reduces suppression to at
  least 70%, it spreads 4 m at half strength, and Suppress spreads its
  rifles over the target section.
- **Reaction delay.** It applied to every change of target, so advancing
  soldiers (whose targets keep changing) fired far less than static
  defenders. It now applies only to a man who has not fired in 10 s.
- **Accuracy.** About 30% at 100 m against a crouched man was too high:
  `accuracy` is now 0.55. A target moving faster than a walk and a
  suppressed shooter each hit at 0.6.
- **Advance.** In move mode team B ran the whole distance while team A
  waited, leaving half of each section 70 m back under fire. An advance
  more than 40 m from its slots now rushes like an attack, then the whole
  section takes its slots.
- **Attack.** An attacker whose objective was hidden held fire. He now fires
  at the nearest enemy of that side he can see.
- **Slot assignment.** Soldiers moving along their own line tie on total
  distance, and the id tie-break could swap two who then collided. A small
  squared-distance term keeps their order. This is an existing bug, which a
  mechanics test had passed only by the luck of the old first-tick fire.
