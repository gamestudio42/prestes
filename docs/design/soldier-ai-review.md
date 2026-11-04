# Soldier movement and individual AI review (2026-11-04)

Asked by the user after the training ground hand checks: "faça uma revisão dos
movimentos e da inteligência individual de cada soldado". This reads the
simulation as it stands after the fixes of 2026-11-04 (`packages/simulation`)
and lists what a player will notice, by priority, with a proposed remedy.

## How a soldier thinks today

Each tick runs, in order: commands, slot upkeep, movement and timers,
separation, `acquireTargets`, `reactToSuppression`, `seekFlank`, `seekCover`,
`updateBounding`, every 8 ticks `repairStalledMovement` and
`repositionForSight`, posture movement, recon, rescue, `fire`, pursuit,
officer loss and aura, cohesion, morale, recovery, `fleePanicked`, routing,
order clean-up and finally `updateFacing`.

- **Sight**: a 65 degree cone and the weapon range, blocked by cover and
  obstacles at eye height for the stance.
- **Targets**: the best visible enemy by a score (distance, cover, already
  suppressed, kind, how many friends already shoot it) with hysteresis; an
  ordered target is locked.
- **Facing**: the target, else the path, else the ordered aim, else (no order)
  the nearest threat within awareness range, slowly.
- **Under fire**: once *suppressed*, a soldier in cover crouches; in the open
  he looks for cover within 12 m that is not closer to the enemy, else drops
  (standing to crouched to prone). *Pinned* soldiers do the same even under
  orders. *Panicked* soldiers lie prone for a while, then stand and run to the
  nearest map edge.
- **Initiative**: idle soldiers with a target in good cover leave alone to
  flank it if a friend keeps it pinned (`seekFlank`); soldiers that cannot see
  their target step aside to a firing point (`repositionForSight`); ordered
  soldiers near cover take a slot (`seekCover`); aggressive ones close in.

## Findings

### Movement

1. **Everything moves at one pace.** Move, advance, recon and pursuit share
   one speed; only the defensive posture slows (0.65). Proposed in
   `order-tempo-and-facing` (pace per order and posture, recon sweep).
2. **1x is twice real time.** The client steps two 0.1 s ticks every 100 ms,
   so a 2 m/s march crosses the screen at 4 m/s, a run. The walk cadence is
   now capped and the feet slide. Decide: make 1x real time (one tick per
   100 ms; 2x and 4x above it), or lower the march speed to about 1.4 m/s.
   Either reads better than a capped cadence.
3. **Soldiers walk blind to the flanks.** While moving they face their path,
   and they only see inside the 65 degree cone, so an enemy 70 degrees off
   the line of march is unseen until he fires. Proposed: movers glance toward
   a shot fired at them or at a neighbour (turn the head, i.e. the facing, for
   a second), and the recon sweep of `order-tempo-and-facing`.
4. **Firing on the move costs nothing.** `fire` does not look at movement:
   a soldier walking at full pace hits as well as one standing still.
   Proposed: accuracy x0.35 while moving; advance and pursue halt for a moment
   to fire (aimed shot), move and withdraw fire only snap shots.
5. **Single file bunching.** Separation (1.2 m) is skipped when both soldiers
   are moving to different points, so a column marching through a gap
   overlaps and then pushes apart on arrival. Acceptable at 2.8 m; tight at
   1.5 m close order. Proposed: keep a 0.9 m minimum even between movers.
6. **Laggards.** The section waits only by slowing a soldier 2 m ahead of the
   average to 0.55; on long routes with turns the shape stretches. Proposed:
   pace the section by its slowest member within a band (keep each soldier
   within 3 m of his formation offset along the shared route).
7. **Stuck soldiers** are repaired every 8 ticks (0.8 s game time); short
   freezes at doors and walls are visible. Acceptable; lower to 4 ticks if it
   shows in play.

### Individual decisions

8. **A section in the open does not react to the first shots.** Without an
   order, `seekCover` does nothing (it needs an order or the defensive
   posture), and `reactToSuppression` waits for the *suppressed* state, so a
   standing section takes several volleys standing. Proposed: when fired at
   (a shot lands within 3 m), an idle soldier crouches at once and, if cover
   is within 6 m on his side, takes it; balanced and defensive postures only.
9. **Suppress stops when its target breaks.** The order ends as soon as the
   target routs; the section falls idle even with the rest of that troop in
   front of it. Proposed: suppress the target's troop (switch to the nearest
   member of the same squad), and end only when none is left in sight.
10. **Panic flight is suicidal.** A panicked soldier stands up and runs to the
    nearest map edge, which may be across the enemy's line of fire. Proposed:
    crawl, then run, toward the rear (away from the threat) to the nearest
    cover behind him; the map edge only when no cover is found.
11. **Lone flankers.** `seekFlank` sends a single idle soldier around a target
    in cover. It is clever but costly: he leaves the section alone. Proposed:
    only with the aggressive posture, or in pairs.
12. **Recon reports once, close, on arrival.** Contacts are counted only
    within 16 m and only when the party halts. Proposed: report contacts as
    they enter sight on the way (with the sight bonus of the proposal) and
    keep reporting while holding.
13. **Accuracy ignores the shooter's stance and the target's movement.**
    Prone and crouched shooters should be steadier (x1.25 and x1.1); a
    running target harder to hit (x0.6).
14. **No fire discipline.** Soldiers open fire at the edge of their range and
    keep firing at targets in heavy cover. Proposed: balanced posture opens
    at 70% of range or when fired upon; defensive only when fired upon or at
    40% of range; aggressive as now.

### Found while applying `reaction-to-fire`

15. **A slower mate stops the others short.** With one soldier crouched (and
    so slower) a line re-forming along its own axis came to rest up to 2 m
    short of its slots: the group pacing and the end-of-route spread do not
    agree when one member lags. Seen in a test with an opening volley.
16. **A soldier displaced by a reaction can miss a slot.** A soldier who had
    just reacted to fire (moved, crouched) got no cover slot when the
    section was then ordered to a wall, and stopped short of it. To look into
    with the slot planner's anchors.

## Suggested order

1. Findings 8 and 9 (reaction to fire, suppress keeps on the troop): most
   visible in the training stations.
2. Finding 4 and 13 (movement and stance in accuracy): makes the orders mean
   something tactically.
3. Finding 2 (time scale): a one-line decision with a large effect on feel.
4. `order-tempo-and-facing` (findings 1, 3 and 12 partly).
5. Findings 10, 11, 14, then 5 to 7.

Each of these changes the simulation and the determinism golden, so they go
through OpenSpec proposals.
