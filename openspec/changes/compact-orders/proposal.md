## Why

Asked by the user on 2026-11-04: "acho que tem muitos tipos de ordem,
queria resumir bem para ficar mais fluido o jogo, só que sem perder doutrina
de infantaria".

The order board has 16 orders (attack, suppress, move, withdraw, hold, aim,
advance, flank, rescue, recon, ambush, pursue, defend, disperse, reserve,
regroup) on three tabs, plus four postures, a bounding toggle, hold fire,
three body stances and a formation list. Several orders are now the same
thing said another way: the facing and spacing drag already does what aim,
disperse and regroup did, and others are one order with a different setting.

Infantry doctrine of the period rests on a small set of acts: march, advance
by bounds under covering fire, fire to kill or to keep heads down, envelop a
flank, hold ground, fall back, scout, and carry the wounded. The board should
be those acts; the rest becomes how they are done (posture, fire control,
spacing, facing), not more buttons.

## What Changes

- **Nine orders on two rows**, from sixteen on three tabs:
  - **Movement**: Move (march, rifle slung), Advance (tactical move by
    bounds, rifle at the ready: the bounding toggle goes away, Advance is
    bounding), Withdraw, Halt (stop and hold here, taking cover in reach).
  - **Fire and manoeuvre**: Attack (aimed fire; follows a target that runs:
    pursue is part of it), Suppress, Flank.
  - **Position**: Defend (take positions in an area, facing the drag), Recon.
- **Folded into others**:
  - Aim: the facing drag of any ground order, and Halt with a drag.
  - Disperse and Regroup: the spacing of the drag (wide open, close order)
    and the formation list; Regroup keeps a one-key shortcut that closes the
    section on its centre.
  - Reserve: Defend with hold fire.
  - Ambush: Defend with fire control set to "on contact" (the section holds
    fire until an enemy is inside 25 m, then opens all together).
  - Pursue: Attack on a target that runs follows him (aggressive and balanced
    postures), stops at 40 m from the start (defensive does not follow).
  - Hold: renamed Halt, with cover in reach.
- **Rescue** leaves the board: right-click (or Attack's button) on a wounded
  comrade starts the casualty drill, the cursor shows it.
- **Fire control** replaces the Hold Fire toggle with three settings: free
  fire, on contact (ambush), hold fire.
- **Postures** drop to three (aggressive, balanced, defensive);
  protect-officer becomes automatic: soldiers near an officer under fire keep
  between him and the threat in every posture.
- **Bootcamp**: station objectives that taught the folded orders now teach
  the new way: ambush is Defend with on-contact fire, disperse and regroup
  are spacing drags, reserve is Defend with hold fire, pursue is Attack on a
  running target, protect-officer is keeping the section by the instructor.
  The station texts in both languages follow.

## Capabilities

### Modified Capabilities

- `orders`: the catalogue is the nine orders; fire control; folded orders
  live on as settings.
- `bootcamp`: station objectives and curriculum coverage over the new set.

## Impact

- `packages/content/src/order-catalog.ts`, the order board, its icons and
  texts; `useOrders`; keyboard shortcuts.
- `packages/simulation`: commands keep accepting the old orders for saved
  replays and tests (mapped to the new ones), Advance always bounds, Attack
  follows, fire control on contact, automatic officer cover.
- `packages/content/src/bootcamp-exercise.ts` and `apps/game/src/training`:
  objectives and texts of stations 2 to 6.
- Tests and e2e that click removed buttons move to the new ones; the
  determinism golden may move (Advance bounding, Attack following).
