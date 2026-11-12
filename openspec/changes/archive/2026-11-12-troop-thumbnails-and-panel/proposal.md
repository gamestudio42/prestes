## Why

The roster builder lists section types as text only, the section cards in
battle show a placeholder square where a portrait should be, and the panel
that details a troop is hard to read: each soldier is a 16 px helmet with
three unlabelled bars, and the troop's state is a line of numbers
(`State: … · Cover: 40% · Cohesion: 80% · Fatigue: 12 · Wound: …`). The
owner asked (2026-11-11) for a thumbnail on every troop type in the lists,
empty today, and for a troop panel that reads better.

## What Changes

- **A thumbnail for every section type**, rendered from the game's own
  soldier model in the army's uniform with the type's weapons (a small
  group for a section, the gun and its crew for a machine gun). Shown in
  the roster builder's type list and roster rows, on the section cards in
  battle and at the head of the troop panel. Thumbnails are built by a tool
  and shipped as images; a type without one fails the content check.
- **The roster builder's type list reads as cards**: thumbnail, name, men,
  weapons as icons with counts, the one-line description, and why a type
  cannot be added when it cannot.
- **The troop panel is redrawn for reading**:
  - a header with the thumbnail, the section's name and type, its army,
    its current order and its men fit, wounded and down;
  - one figure per soldier instead of the helmet and three bars (owner's
    design, 2026-11-11): helmet colour = cover, body colour = health, a
    cartridge clip under him = ammunition, marks for wounded, pinned and
    routed; leader first, casualties last; role, weapon and state word in
    the tooltip;
  - the troop's condition as four named gauges (morale, cover, cohesion,
    suppression) with a word for each band, not bare numbers;
  - what needs the player now, at the top: out of ammunition, pinned, a
    casualty waiting, the gun without a gunner.
- The section card's placeholder portrait and its "placeholder" label go.
- All labels in PT-BR and EN; every figure keeps a text alternative.

Design intent. Player fantasy: an officer who knows his sections by sight
and reads their condition in a glance. Pillar: readable tactics. Loop beat:
choosing the force, and mid-battle triage (who can still fight, who needs
help). Hypothesis: a player finds the section that is out of ammunition or
pinned in under two seconds, without hovering for a tooltip.

MVP: thumbnails for every type of the three armies, the roster cards, the
redrawn troop panel. Non-goals: hand-drawn portraits (the slot can take one
later, per type), per-soldier names or biographies, new simulation values,
and a redesign of the orders board or the top bar.

Historical and ethical note. The thumbnails show uniforms and weapons from
`docs/history/FORCES.md` and `WEAPONS.md` through the soldier kit; they add
no claim of their own and depict no named person. The campaign's
multi-perspective approach and its playable figures are unchanged.

## Capabilities

### New Capabilities

- `troop-panel`: section thumbnails, the roster's type cards, and the troop
  panel's header, soldier figures, gauges and alerts.

### Modified Capabilities

- `presentation`: "Section cards" loses the placeholder portrait and takes
  the section's thumbnail.

## Impact

- `tools/`: a thumbnail tool (headless render through Playwright, as the
  map previews are made) and `pnpm thumbs`; the content check.
- `packages/view3d`: `thumbnails.ts` gains a section render from the
  soldier kit.
- `apps/game/src/ui/hud`: `TroopSummary.tsx`, `WeaponCard.tsx`,
  `SquadCards.tsx`; `ui/menu/RosterBuilder.tsx`; their styles.
- `apps/game/public/assets/sections/`: one image per type; `docs/assets.md`.
- e2e: the HUD and setup specs and their visual baselines.
- `redo-battle-hud` (planned after this change) frames this panel on its
  parchment card and does not redraw it.
- Depends on `faction-armies` (types per army) and on
  `soldier-animation-and-textures` (uniforms) for the final pictures; the
  tool and the panel can be built before them and re-run after.
