## Context

`moveUnit` multiplies a soldier's speed by stance, posture (defensive 0.65),
terrain, cohesion, fatigue, wounds and the group factor. `updateFacing` turns
a soldier toward his target, his path, his aim, or the nearest threat. The
vision cone is 65 degrees and is only drawn in the order preview. The ring
under a soldier is a flat full circle coloured by faction and selection.

## Decisions

### Pace

A single `ORDER_PACE` table (shared, so the preview and tests read it) maps
the current order to a factor; `POSTURE_PACE` maps the posture. The step is
multiplied by both. Orders not listed keep 1.0. Values from the proposal;
they are tunables, kept in one place.

### Recon sweep

While a soldier's order is `recon` and he has no target, his facing is the
order facing (or his heading) turned by `50 * sin(2 * pi * t / 4 s)` degrees,
with a per-soldier phase (by id) so a party does not sweep in step. Facing
drives the vision check, so the sweep really widens what the party sees. The
recon sight bonus is 1.15 on the sight range.

### Posture stance

Defensive sets the stance to crouched when the soldier moves or halts,
unless the player set a stance explicitly (`stanceLocked`). Aggressive and
balanced leave the stance alone.

### Front mark

A small flat arrowhead on the ring's edge, a child of the rig root so it
turns with the soldier, in the ring's colour (faction or selection). The
vision cone is not drawn. Proxies (strategic band) keep the plain ring.

### Run clip

Built like walk with a longer stride, forward lean and arms pumping; chosen
by the view when the soldier's order is pursue, or when he moves faster than
2.4 m/s of game time.

## Risks

- Pace changes move the determinism golden; the new hash is recorded with
  the reason.
- E2E specs that wait for an advance or recon to arrive may need more ticks;
  they step the simulation with a tick budget, so only budgets change.
