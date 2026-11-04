## Why

The bootcamp must teach and exercise every troop and officer mechanic before any
campaign work starts. A review on 2026-11-03 (headless audit of each order plus a
manual Chrome pass) found that the current three-phase exercise gates progress on
only five objective kinds and leaves most mechanics as optional drills. It also
found mechanics that do not work or do not match the durable specs, and a HUD and
menu with repeated or mismatched icons:

- **Attack, suppress and ambush stall behind cover.** Soldiers stop "in range"
  behind sight-blocking cover (for example the stone at (0, 4)) and never fire or
  reposition: in the audit 0 of 5 riflemen fired in 300 ticks. The approach also
  stops at `weapon.range × 0.82` while firing uses `combatRange`, which differ
  outside training.
- **Officer loss has no morale effect.** The `orders` spec already requires a
  morale and cohesion drop and the loss of the aura; the code only interrupts
  protect-officer orders.
- **Four catalogue orders have no button.** `advance`, `disperse`, `reserve` and
  `regroup` run in the simulation, and the `orders` spec requires every catalogue
  order to be listed, but the order board shows only 12 orders.
- **Training ammunition runs out early.** In a manual run the section was at
  15/0 rounds early in phase 2.
- **Icons repeat.** Shield is used for suppress, defend, balanced posture and
  hold fire; Eye for recon, ambush, defensive posture and preview; Crosshair for
  attack and pursue; the codex uses a code-brackets icon.
- **HUD and menu look unfinished.** The player HUD shows debug readouts (tick,
  paths, outcome); the bottom command row is an empty 52 px bar because its text
  is visually hidden; the start screen has a placeholder tagline, a repeated
  kicker and no "continue" for saved progress.

## What Changes

- **BREAKING (bootcamp content):** replace the three-phase exercise with seven
  sequential stations, each with mandatory objectives that are verified from
  simulation state: 1 formation and movement, 2 fire, 3 maneuver, 4 defense,
  5 recon and pursuit, 6 wounded and officer, 7 final combined exercise.
  Saved three-phase progress migrates to the matching station.
- The officer stays a non-controllable NPC instructor who accompanies the
  section, gives the orders for each station and is the subject of the officer
  mechanics (aura, protection, loss).
- Fix the attack approach: units with an attack, suppress or ambush intent
  reposition when the target is in range but not visible, and the approach uses
  the same range as firing.
- Implement the officer-loss consequence already specified: aura removed,
  bounded morale and cohesion drop.
- Refill magazine and reserve for the player troop at the start of every
  training station.
- Add the missing catalogue orders (advance, disperse, reserve, regroup) to the
  order board.
- Give every order, posture and HUD control a distinct icon from one icon map,
  and replace the mismatched codex and sandbox icons.
- Move tick, path count and outcome from the player HUD to the sandbox
  inspector; show the selection, current order and stance in the command row
  instead of hiding them.
- Rework the start screen: final tagline, no repeated kicker, "Continue" and
  "Restart" when progress exists, and the language and audio options.
- Add a permanent headless mechanics regression suite (one scenario per order
  and officer mechanic) based on the review audit.

Non-goals: the player-controlled command troop (commander + 2) for campaign and
skirmish, campaign missions, save/load beyond bootcamp progress, new weapons,
cavalry or artillery, voice audio.

Player fantasy and core loop: the player learns to command a 1920s rifle
section through a sequence of instructor-led stations, each ending in a clear
success check. Historical scope: none; the bootcamp is labelled fictional
training. Multi-perspective approach: unchanged; no historical figure is
playable in the bootcamp, and the officer is a fictional training-cadre
instructor.

Legal/ethical note: no book text, historical claims or third-party assets are
added. Icons stay Lucide (ISC, already registered). Training fire stays
non-lethal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bootcamp`: seven-station curriculum with mandatory objectives per mechanic,
  instructor that accompanies the section, per-station ammunition refill,
  progress migration, failure and debrief across stations.
- `simulation`: attack approach with line of sight and a single range rule;
  training ammunition refill in the phase setup; instructor follow behavior.
- `orders`: order board lists every catalogue order (behavior already required;
  scenario made explicit); officer-loss consequence scenarios made testable.
- `presentation`: distinct icon map, HUD shell without debug readouts, visible
  command row, start screen with continue/restart and options.

## Impact

- `packages/simulation/src/systems/` (movement, combat, morale, spawning) and
  `packages/shared` (training setup fields).
- `packages/content` (bootcamp stations, objectives, locale keys in EN and
  PT-BR, order catalogue).
- `apps/game` (exercise director and objective evaluation, `ui/hud/orderMeta`,
  HUD components, start screen, sandbox inspector, styles).
- Tests: new `packages/simulation/test/mechanics.test.ts`; updated bootcamp unit
  tests; e2e training spec rewritten per station; visual baselines re-recorded
  after the icon and HUD change.
- The determinism golden changes (attack approach and officer loss alter
  combat); the new hash is recorded with `pnpm check:determinism --update`.
