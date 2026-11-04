## Why

Asked by the user on 2026-11-04 while playing the training ground:

- "quero também alguma indicação do que é frente e do que não é; gostaria de
  usar melhor o círculo embaixo do soldado para marcar o cone de visão".
- "os movimentos são todos na mesma velocidade; deveríamos ter velocidades
  diferentes, por exemplo no reconhecer os soldados vão mais devagar,
  varrendo para buscar inimigos; seria legal que a mudança de postura
  refletisse no comportamento da tropa".

Today every order marches at one pace (only the defensive posture slows to
65%), a soldier's front shows only in the order preview, and the posture
barely changes how a section moves.

## What Changes

- **Front mark**: the ring under each soldier gets a small notch, a pixel
  arrowhead on its edge pointing where he faces, turning with him, so a
  section's front reads at a glance. The vision cone itself stays a
  mechanic only and is never drawn (the user: "o cone de visão nem precisa
  aparecer hora nenhuma, apenas fazer parte da mecânica"); today it is not
  drawn anywhere either.
- **Order tempo** (simulation): each ground order moves at its own pace, and
  the soldiers act it out:
  - Move: march, 1.0.
  - Advance: deliberate, 0.8, rifle at the ready.
  - Recon: slow, 0.5. The scouts sweep their front left and right (about 50
    degrees each way, a 4 s cycle) while moving and while halted, and their
    sight reaches 15% further.
  - Pursue: double time, 1.3, fatigue builds twice as fast.
  - Withdraw: 1.2, rifle at the ready.
  - Flank: 1.1.
  - Defend, Ambush and Reserve: 0.9 into position; Ambush moves crouched.
- **Posture in behaviour**:
  - Aggressive: 1.1 pace; closes on the enemy (as today); halts standing.
  - Balanced: as today.
  - Defensive: 0.65 pace (as today); moves and halts crouched unless told
    otherwise; seeks cover without an order (as today).
- **Animation follows the tempo**: a new run clip for double time; the walk
  cadence follows the order's pace, so a recon party steps slowly and a
  pursuit runs.

## Capabilities

### Modified Capabilities

- `formations`: order tempo, recon sweep and posture behaviour.
- `presentation`: the front mark on the ring and the run clip.

## Impact

- `packages/simulation`: a pace table per order and posture in movement,
  recon sweep in facing, recon sight bonus, pursuit fatigue, posture stance.
  The determinism golden changes (advance and pursue now move at another
  pace); the new hash is recorded.
- `packages/view3d`: the front mark on the ring in the character layer; the
  run clip choice.
- `art-src/blender/target_soldier.py`: the run clip.
- Tests: pace per order and posture, the sweep, the sight bonus; a view test
  for the front mark; e2e unchanged apart from timings that depend on pace.
