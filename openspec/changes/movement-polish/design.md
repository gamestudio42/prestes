## Context

The facts are measured in the proposal: bunched defenders, sideways rushes, a
364 ms Attack preview. Cover slots come from `packages/shared/src/cover-slots`
(a layout per cover kind) and are assigned in `packages/simulation/src/systems/slots.ts`.
Rushes are `assignBoundingAdvance` in `systems/bounding.ts`. The preview is
`planOrderPreview` in `packages/shared/src/preview.ts`, called from
`useOrders` in `apps/game` on every render. Every frame update re-renders.

## Goals / Non-Goals

**Goals:** soldiers keep a man's width apart in cover and in the open; rushes
gain ground toward the enemy; the preview stays under 2 ms with 33 soldiers
selected; a bunching figure in the feel gate. The simulation stays
deterministic and free of Three.js, React, the DOM and Node APIs.

**Non-Goals:** new formations, new orders, terrain or fog of war.

## Decisions

### Merge overlapping slots, place the overflow

Slot generation runs over the frame's covers. After it, slots closer than
1.2 m to an already kept slot are dropped. The order is stable (cover id,
then slot index), so the merge is deterministic. The parapet's slots usually
win, being the better cover. When an ordered section has more soldiers than
free slots, the overflow takes the section's formation slots (the same
`formationSlots` used for moves) at the destination. Those slots are matched
by the existing minimum-distance assignment, skipping places within 1.2 m of
a taken cover slot. That replaces the single fallback point.

Rejected alternative: spacing slots only in the view. The overlap is real in
the simulation (soldiers shoot from there), so it is fixed where it happens.

### Forward cone for rush cover

A cover qualifies if the angle between unit-to-cover and unit-to-objective is
at most 45 degrees and the cover is at least 6 m nearer the objective. This
takes two dot products and no trigonometry, as the simulation lint requires.
The scoring is otherwise unchanged.

### Straight guides for targeted orders, memoized

`planOrderPreview` for targeted orders draws a straight guide from each
soldier to his section's approach point: the target, or for a flank the flank
point taken from the section's centre. A first version searched one route per
section. That brought 470 ms down to 31 ms, still three 170 m A* searches. A
targeted order moves by rushes and finds its way as it goes, so a searched
route was not what would happen anyway. In `useOrders`, the preview is wrapped in `useMemo`, keyed on the
pointer's 1 m cell, the hovered unit, the selection, the order, facing and
spacing, and a coarse frame key (the selection's positions rounded to 1 m).
It no longer recomputes on every tick of a still scene. A shared test times
the three-section Attack preview under 2 ms; a 20 ms guard keeps it
meaningful on slow machines in CI.

### Bunching in the report

Every 10 ticks the report counts, per side (while it has 6 or more fit),
the fit soldiers with a mate within 1 m. It keeps the largest share, and the
feel test bands it under 15%. The first form (two mates within 1.5 m)
counted a correctly spaced trench line (men 1.2 to 1.4 m apart) as bunched,
and missed the real fault, pairs half a metre apart.

## Risks / Trade-offs

- Merging slots reduces the slot count of a trench line. A section of 11 on
  four bays may now have overflow men in formation behind the line. The
  report and the cover-slots tests show whether that weakens the defence.
- The per-section attack route is less exact for a spread section, but it is a
  preview: the real attack goes by rushes.
- Positions change, so the determinism golden is re-recorded once.
