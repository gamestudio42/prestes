## Context

See proposal.md. Observed today:

- `apps/game/src/ui/menu/RosterBuilder.tsx` lists types as text (name, men,
  weapon counts, description or the refusal reason) and the roster as rows.
- `apps/game/src/ui/hud/SquadCards.tsx` draws a `section-portrait` block
  titled `hud.portraitPlaceholder` (test id `portrait-placeholder`).
- `TroopSummary.tsx` draws one 16 px helmet per soldier with three vertical
  bars (health, morale, ammunition); everything else is in a tooltip.
- `WeaponCard.tsx` shows weapon lines, the gun's state and a text line of
  state, cover, cohesion, fatigue and wound.
- `packages/view3d/src/thumbnails.ts` already renders props to data URLs in
  the browser for the editor's tree list; `tools/map-previews.ts` already
  produces committed images from a headless run.

The simulation/presentation boundary is untouched: the panel reads the
frame. Morale bands exist in shared code (`packages/shared/src/morale.ts`);
whether cover, cohesion and suppression have named bands there is checked at
apply (task 3.3) and, where they do not, the bands are added to shared data
with the simulation's own thresholds, not invented in the view.

## Goals / Non-Goals

**Goals:**

- Pictures that cannot go stale silently: built from the catalog, checked.
- A panel read without hovering, in both languages, at 1280 x 720.
- No new frame fields unless a row needs one the frame lacks.

**Non-Goals:**

- Rendering thumbnails at run time in the game (a second WebGL context and
  the soldier kit on the menu's critical path).

## Decisions

**D1. Thumbnails are built ahead and committed.** A tool opens a dev page
that poses the type's men (the soldier kit, the army's uniform, each man's
weapon, the gun on its tripod), renders at 2x of the largest shown size and
writes `apps/game/public/assets/sections/<type>.png`. Run-time rendering
was considered (always fresh); rejected for start-up cost and because the
desk menu does not load the soldier kit. Freshness comes from the content
check: a hash of the type's composition and uniform set is stored beside
each image, and a mismatch fails the check with "run `pnpm thumbs`".

**D2. One picture per type, shown at three sizes.** The roster card, the
section card and the panel header scale the same image with pixelated
scaling, as the desk art does. A later hand-drawn portrait replaces the
file; nothing else changes.

**D3. Composition by type.** Up to four men in a tight group, leader in
front; a crew-served gun shows the gun and two crewmen; an officer's
section shows the officer forward. Camera, light and palette are fixed so
the set reads as one family.

**D4. The troop panel is one component with a row per man.** `TroopSummary`
becomes header, alerts and rows; the gauges move from `WeaponCard`'s text
line into the panel; `WeaponCard` keeps weapons and the gun's state. Rows
are 18 to 20 px high so eleven fit in the panel's present height at
1280 x 720; the exact height is set against the overflow e2e.

**D5. Words and bands from shared data.** State words reuse the existing
`state.*` and `wound.*` keys; band words are new keys under `hud.band.*`.
Thresholds are imported from shared modules.

**D6. Alerts are derived, not stored.** A pure function from the selected
units' snapshots to an ordered alert list, unit-tested without React.

## Risks / Trade-offs

- [Rows take more room than helmets] → the map-covering area is fixed to
  the panel; larger selections scroll inside it (spec), and the collapsed
  orders panel stays available.
- [Thumbnails drift from the uniforms when the textures change] → the hash
  includes the uniform texture's file hash; the check fails until the tool
  is re-run.
- [Visual baselines churn] → baselines are refreshed once, in the task that
  lands the panel, and reviewed.

## Open Questions

- The thumbnail's pixel size, fixed at apply against the roster card's
  final width.
