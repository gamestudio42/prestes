## Context

See `proposal.md`. The current HUD is a compact sepia deck built on the old
four-column structure. It already owns the required commands, preview, hide and
localization, so this change is a presentation refactor plus one new
presentation-only capability, not a simulation change.

The target composition from the reference image is:

```text
top rail: brand | tick | camera segmented | paths | outcome | language | tools |
          pause | speed | post
bottom-left: squad card              bottom-center: seven action slots
bottom-right: weapon/status card     bottom row: position/maneuver/support/
                                     formation/stances/objective
```

## Goals / Non-Goals

**Goals:**

- Match the reference composition, tone, spacing, rounded panels, transparency
  and icon language as closely as practical without copying its artwork.
- Keep every existing order, readout, locale key, test id and hotkey.
- Make icon actions self-explanatory through localized hover/focus infoboxes.
- Add the single shot sound without making audio authoritative or deterministic.
- Leave reusable tokens for the training campaign screen.

**Non-Goals:**

- New combat mechanics, balance, AI, terrain or mission content.
- New character/environment art or a full sound mix (only gunshot).
- Copying the reference layout as a bitmap or reproducing its painted map.
- Changing the worker protocol or simulation state.

## Decisions

- **HUD as named regions, not a generic grid.** `Hud` renders `TopRail`,
  `SquadCard`, `ActionBar`, `WeaponCard` and `CommandRow`. The existing status
  readouts move into these regions; no readout is dropped.
- **Seven action slots.** The first six map to move, attack, suppress, flank,
  withdraw and hold. The seventh is `clear`: it cancels a pending order and, when
  idle, clears the current order intent without inventing a new simulation
  command. The control is disabled when there is nothing to clear.
- **Category dropdowns replace the tactical grid.** Position, Maneuver and Support
  use one accessible listbox each. Every option keeps its existing
  `tactical-*` test id. Opening a menu, keyboard navigation, Escape and outside
  click are explicit tests.
- **Tooltip primitive.** A single `Tooltip` component renders a small rounded
  infobox on hover and keyboard focus, flips within the viewport, and uses
  `aria-describedby`. Tooltip title/description keys come from the locale
  catalog. It is used on icon buttons, order slots and stat icons; text labels do
  not get redundant tooltips.
- **Visual tokens.** CSS custom properties define ink, panel, panel-raised,
  border, paper, dim, gold, rust and positive colors, plus 8/12 px radii and a
  consistent 1 px hairline. Panels use a translucent dark fill with a subtle
  vertical paper grain; no heavy blur that would cost frame time over the 3D
  canvas.
- **Typography.** Add a self-hosted OFL display serif for the brand and mission
  headings; keep Barlow/Barlow Condensed for numeric and control text. Register
  the font and licence in the asset register. No CDN.
- **Icon system.** Reuse Lucide with a consistent 1.75 stroke; add small original
  SVGs only for the rifle, heart, link, equipment and star where Lucide is not
  close enough. Icons remain decorative with text/aria labels.
- **Audio is presentation-only.** A single `ShotAudio` manager lazily creates an
  `AudioContext` after the start gesture and listens to `shot` events already
  delivered in frames. It deduplicates by tick/unit id, caps concurrent voices at
  four, sets a modest volume and stops on dispose. It reads no simulation state
  and never runs in the worker.
- **Audio asset/licence.** The supplied Google Actions OGG is not redistributable
  outside Actions on Google, so the implementation synthesizes an original
  gunshot buffer at runtime and ships no third-party sample. The asset register
  records the original procedural sound.
- **Responsive behavior.** Desktop keeps the reference composition. At narrow
  widths the top rail wraps in groups, the bottom deck keeps the squad/action/
  status regions and the command row collapses; no control is clipped or hidden
  without an accessible overflow.
- **In-game visual scope.** HUD, overlays, cursor, selection rings, path colors
  and training-map-facing tokens are in scope. Character meshes, terrain,
  buildings and a full palette overhaul are not.

## Risks / Trade-offs

- **Reference fidelity vs. existing behavior.** â†’ Preserve every command and test
  id; visual grouping is allowed to change, behavior is not.
- **Dropdowns hide options.** â†’ Provide keyboard navigation, current selection,
  localized descriptions and a tooltip/availability hint; E2E covers each order.
- **Tooltips on hover can flicker over the canvas.** â†’ Use a shared delay/portal,
  viewport collision handling and focus support; no tooltip captures pointer
  events.
- **Audio autoplay policies.** â†’ Unlock on the existing start click; a missing or
  blocked asset logs once and never affects gameplay.
- **Font/licence risk.** â†’ Self-host an OFL font and record it in the asset
  register; do not fetch from a CDN at runtime.
- **Audio asset licence unknown.** â†’ Verify before bundling; fallback to an
  original/clearly licensed file if needed.

## Migration Plan

No data migration. The HUD and audio are client-side. Reverting the change restores
the previous `Hud` and removes the audio manager without touching saved games or
simulation hashes.

## Open Questions

None for this slice.

