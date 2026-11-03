## Why

The skirmish now aims, paths around the building and seeks cover, but every unit
still fights as an individual. Sections bunch on one destination, fire at the
closest enemy regardless of exposure, and suppressed units stay in the open. The
next step is a small, deterministic tactical layer: fire and movement that reads
as a section, not six independent rifles.

## What Changes

- Add deterministic target scoring: exposed, close, suppressed and officer targets
  rank higher; allies avoid overkill by discounting enemies already engaged.
- Add flanking: when a target is in cover and an ally is pinning it, one unit
  moves to a side position that has line of sight to the target.
- Add suppression reaction: a suppressed unit without a player move order seeks
  retrograde cover; when none is available it hunkers down without overriding a
  player stance lock.
- Add section spacing: a multi-unit move assigns a line of slots perpendicular to
  the travel direction instead of sending every unit to the same point.
- Preserve player authority: automatic movement never replaces an active player
  move order, an explicit attack target is kept while valid, and a player stance
  lock is never overridden.
- Add a basic Men of War-inspired orders panel: section cards on the left, an
  order grid in the centre and selected-section status on the right.
- Add player-issued `suppress`, `flank` and `withdraw` commands, plus visible
  order modes and a hold-position command.
- **Non-goals:** campaign, new units or weapons, artillery, cavalry, destructible
  cover, a full Men of War clone, cover arcs, command queues, direct control and
  audio.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation`: tactical target selection, flanking, suppression reaction,
  section movement spacing and player-issued suppress/flank/withdraw/hold orders.
- `presentation`: the basic orders panel, section cards, order modes and localized
  command feedback.

## Impact

- `packages/simulation`: target scoring, flank/fallback state, formation slots,
  AI cooldowns and the new order commands.
- `packages/shared`: formation spacing helper and command payloads.
- `apps/game`: bottom orders panel, section cards, pending-order mode, command
  wiring and localized labels.
- `packages/view3d`: existing paths show flank and withdraw routes; no new art.
- `packages/content`: PT-BR/EN keys for the panel and orders.
- Tests: engine scenarios for the new commands, locale validation, Playwright
  smoke coverage for the panel; existing combat and determinism tests stay green.
- No GitHub action.

## Player fantasy and core loop

The player commands a small column section in a 1920s firefight. The loop stays
the same: select a section, give it an order and let the section fight. A compact
bottom panel keeps the section card, order grid, stance and current order in one
place, in the spirit of Men of War without copying its interface. The difference
is that the section now uses fire and movement: one unit can pin while another
flanks, exposed enemies are prioritised, and suppressed soldiers look for better
ground.

## Historical scope and perspective

This is a dramatised tactical skirmish, not a reconstruction of a specific
engagement. It adds no historical claim and no new named figure. The current
skirmish is commanded by an unnamed column section; the multi-perspective campaign
(Prestes as narrative spine, missions commanded by the figure present) remains
future work. AI behaviour is fictional and labelled as such in the design.

## Legal and ethical note

The tactical AI, scoring and geometry are original code. No text, art, map or
code is copied from Vazante or another game. The change adds no book text and no
new sensitive historical assertion; source policy remains unchanged.

