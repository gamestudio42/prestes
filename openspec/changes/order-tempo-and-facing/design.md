## Context

- The client (`GameClient`) sends `step` with `speed` ticks every 100 ms;
  the buttons give 1, 2 or 4 ticks, labelled 0.5x, 1x and 2x. A tick is
  0.1 s of game time, so "1x" is twice real time.
- `moveUnit` moves a soldier at `unit.speed` (2 m/s, the officer 2.4)
  times stance, posture (defensive 0.65), terrain, cohesion, fatigue,
  wounds and the group factor, at full speed from the first tick.
- `updateFacing` turns a soldier toward his target, his path, his aim or the
  nearest threat. The view sets the rig's yaw from the snapshot each frame.
- `soldier-clips.ts` picks idle, walk, crouch-walk or crawl, with
  `walkTimeScale` clamped to 0.4..1 of an authored 1.75 m/s.

## Decisions

### Clock

1x becomes one tick per 100 ms. The client keeps a fractional accumulator so
0.5x steps one tick every other interval; 2x and 4x step 2 and 4. Speed
values in storage are migrated (old 2 means the new 1x). Game-time numbers
in the simulation (ticks, seconds, cooldowns) do not change; only how fast
the player sees them.

### Gaits

`GAIT_SPEED = { slow: 1.0, walk: 1.5, quick: 2.5, run: 3.5 }` (m/s) and
`orderGait(unit)` in shared. The gait comes from the order and the moment:
the rushing team of a bound runs, an attacker whose target is moving away
runs, a soldier moving into cover under fire runs. `unit.speed / 2` is his
fitness factor (1.0 for riflemen, 1.2 for the officer). Posture multiplies
(aggressive 1.1, defensive 0.8), then the existing stance, terrain,
cohesion, fatigue, wound and group factors.

The group factor (a section keeps to its slowest member) stays, so a
section still arrives together.

### Fatigue

Fatigue per tick of movement is the march rate times 1 (slow, walk), 1.3
(quick) or 2 (run). Above 70 the gait is capped at walk until it falls
below 50 (hysteresis, so a soldier does not flicker between gaits).

### Easing

Each soldier keeps `moveSpeed` (m/s). Each tick it moves toward the target
speed by at most 3 m/s² (0.3 per tick), and within the stopping distance
(`v² / 2a`) of his slot the target becomes the speed that stops him on it.
Deterministic: plain arithmetic on the tick.

### Recon sweep

While a soldier's order is `recon` and he has no target, his facing is the
order facing (or his heading) turned by `50 * sin(2π t / 4 s + phase)`
degrees, the phase from his id. Facing drives the vision check, so the sweep
really widens what the party sees. Recon sight is 1.15 times the range.

### Posture stance

Defensive sets the stance to crouched when the soldier moves or halts,
unless the player set one (`stanceLocked`). Aggressive and balanced leave
the stance alone.

### View: cadence, clip choice, turning

- Each clip declares its authored ground speed: walk 1.5, walk-ready 1.4,
  run 3.5, crouch-walk 1.0, crawl 0.4 m/s.
- The clip is chosen by the soldier's speed from snapshot positions
  (smoothed over a few frames): idle below 0.2, walk or walk-ready below
  2.2, run above; crouched and prone use their own clips.
- Time scale is actual over authored, clamped to 0.75..1.25, so feet never
  skate visibly; outside that range the next clip takes over.
- Cross-fade 0.3 s between movement clips (the hit and death fades stay).
- The rig's yaw follows the snapshot facing at up to 270°/s, the shortest
  way round.

### Run clip

Built like walk in `target_soldier.py`: 1.6 m stride, 12° forward lean,
arms working, rifle carried across the chest at the port. Walk is re-timed
so one cycle covers 1.5 m/s at its stride.

### Front mark

A small flat arrowhead on the ring's edge, a child of the rig root so it
turns with the soldier, in the ring's colour. The vision cone is not drawn.
Proxies (strategic band) keep the plain ring.

## Risks

- Determinism golden moves; recorded with the reason.
- Slower walking (1.5 against 2 m/s) lengthens drills; bootcamp time limits
  are re-measured and raised where needed, and e2e tick budgets grow.
- Real-time 1x halves how fast a match plays; 2x and 4x are there for the
  quiet stretches. To be checked by hand that it does not feel slow.
