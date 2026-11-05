## Why

Asked by the user while playing the training ground:

- 2026-11-04: "os movimentos são todos na mesma velocidade; deveríamos ter
  velocidades diferentes, por exemplo no reconhecer os soldados vão mais
  devagar, varrendo para buscar inimigos; seria legal que a mudança de
  postura refletisse no comportamento da tropa", and "o cone de visão nem
  precisa aparecer hora nenhuma, apenas fazer parte da mecânica".
- 2026-11-05: "as pernas estão muito rápidas, a velocidade 0,5 para
  considerar 1; temos então que prever a diferença entre correr e caminhar,
  algumas ordens podem ser mais rápidas e outras mais devagar. Quero que seja
  realista mas não quero que seja tão lento, e quero que as pernas e
  movimentações sejam mais suaves".

Today "1x" runs the simulation at twice real time (two 0.1 s ticks every
100 ms), and every soldier moves at 2 m/s of game time, so on screen he
covers about 4 m/s, a run, while playing the walk clip: the legs look
hurried. Every order moves at one pace; a soldier starts and stops at full
speed and his body snaps to a new heading.

## What Changes

- **Real-time clock**: 1x is real time (one tick every 100 ms). The speed
  buttons become 0.5x, 1x, 2x and 4x, so the player can still hurry a quiet
  stretch.
- **Gaits by order** (simulation), absolute ground speeds before posture,
  stance, terrain, cohesion, fatigue and wounds:

  | Gait | Speed | Orders |
  |---|---|---|
  | Slow, sweeping | 1.0 m/s | Recon |
  | Walk | 1.5 m/s | Move, Defend, Advance between bounds, Halt into cover |
  | Quick | 2.5 m/s | Flank, Attack closing, Regroup |
  | Run | 3.5 m/s | Withdraw, the rushing team of a bound, Attack following a running target, reaction to fire into cover |

  A soldier's own speed (the officer is fitter) scales his gaits.
- **Running tires**: run builds fatigue at twice the march rate and quick at
  1.3 times; a winded soldier (fatigue above 70) drops to a walk until he
  recovers.
- **Posture in behaviour**:
  - Aggressive: gaits 10% faster; closes on the enemy (as today); halts
    standing.
  - Balanced: as today.
  - Defensive: gaits 20% slower; moves and halts crouched unless the player
    set a stance; seeks cover without an order (as today).
- **Recon sweep**: scouts sweep their front left and right (about 50 degrees
  each way, a 4 s cycle, each with his own phase) while moving and halted,
  and their sight reaches 15% further.
- **Smooth movement**:
  - Speed eases in and out: a soldier reaches his gait in about half a
    second and slows before he stops on his slot.
  - The body turns at a limited rate in the view (about 270 degrees a
    second) instead of snapping.
  - Clip changes cross-fade over about 0.3 s.
- **Legs follow the ground**: each clip has the ground speed it was authored
  for; its playback rate is the soldier's actual speed over that, clamped so
  feet never skate. A new run clip (longer stride, forward lean, arms
  working, rifle carried at the port) plays above 2.2 m/s; the walk clip is
  re-timed for 1.5 m/s.
- **Front mark**: the ring under each soldier gets a small arrowhead on its
  edge pointing where he faces, turning with him. The vision cone stays a
  mechanic only and is never drawn.

## Capabilities

### Modified Capabilities

- `formations`: gaits by order, fatigue from running, posture behaviour,
  recon sweep, speed easing.
- `presentation`: real-time clock and speed buttons, the run clip, cadence
  from ground speed, smooth turning and cross-fades, the front mark.

## Impact

- `packages/shared`: the gait table (`GAIT_SPEED`, `orderGait`) and posture
  factors, read by the simulation, the view and tests.
- `packages/simulation`: movement uses the gait, easing and fatigue rules;
  recon sweep in facing and the sight bonus; posture stance. The determinism
  golden changes; the new hash is recorded with the reason.
- `apps/game`: the client steps one tick per 100 ms at 1x; the speed
  buttons.
- `packages/view3d`: clip choice by speed, cadence, turning rate,
  cross-fades, the front mark.
- `art-src/blender/target_soldier.py`: the run clip; walk re-timed.
- Tests: gait per order and posture, fatigue and winded walk, easing, sweep,
  sight bonus; view tests for cadence, clip choice and the front mark.
  Bootcamp time limits and e2e tick budgets grow where soldiers now walk
  slower than before (2 m/s to 1.5 m/s).
