## Why

Phase 3 of the redesign agreed on 2026-11-03: the game world stays low-poly 3D,
while the HUD, the menus and the compendium of the Coluna Prestes move to a pixel
art style. Today the interface mixes a smooth vector look (Barlow and Cinzel
fonts, soft shadows, rounded and clipped panels, Lucide line icons) with the
pixel-post 3D scene, and the user has said several icons do not match or repeat
in spirit. The compendium is a plain list of two figures, although the project
already has sourced material for events, places and weapons.

Decisions taken with the user on 2026-11-04:

- **Pixel kit**, not a low-resolution retro render: the layout and readability
  stay, drawn with a pixel font, hard 2 px borders, stepped corners and a
  limited palette.
- **Pixelify Sans** (OFL) as the single interface font, with full Portuguese
  accents.
- **Original 16 x 16 icons** drawn for Prestes, authored in Aseprite (the user
  has it installed) so they can be edited later, replacing Lucide.
- **Compendium as a pixel book with sections** (figures, events, places,
  weapons) filled only from material the project has already sourced. New
  historical research is a later change.

## What Changes

- **Pixel visual system**: palette tokens (sepia ink, parchment, gold, muted
  red and olive), Pixelify Sans self-hosted, panels and buttons with 2 px
  borders and stepped (not rounded or clipped) corners, hard 2 px offset
  shadows instead of blurred ones, sizes on a 2 px grid, focus and pressed
  states drawn as pixel insets.
- **Pixel icon set**: one Aseprite source file with a named slice per icon
  (every order, posture, stance, top-bar control and status glyph, about 60),
  exported to a PNG sheet and a JSON index that the game uses as an alpha mask
  so icons take the current text colour, drawn at 2x (32 px) or 1x with
  nearest-neighbour scaling. A tools script exports the sheet with the
  Aseprite command line; the exported files are committed, so building and
  testing do not need Aseprite. Lucide is removed.
- **HUD restyle**: top bar, squad card, order board, command row, weapon card,
  tooltips, field overlays (cover slot chip, placement status), training panel,
  sandbox panel, debrief, order callouts and the commander balloon.
- **Menus**: the start screen keeps the public-domain photograph, shown
  pixelated (downscaled and drawn with nearest-neighbour scaling under a sepia
  palette overlay); title and buttons in the pixel kit.
- **Compendium**: a pixel-art book with tabs Figures, Events, Places and Weapons.
  Entries come from a new content registry built from the sourced history
  documents (the two figures, the timeline events, the places named in them,
  and the documented weapons), each with its source reference and confidence,
  in PT-BR and EN. The known historical corrections stay visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: period typography and icons, the HUD styling and distinct
  icons requirements change to the pixel kit, the original icon set and the
  Aseprite source.
- `historical-content`: the compendium gains a sectioned registry (events,
  places, weapons) with sources and confidence.
- `localization`: compendium entries in both catalogs.

## Impact

- `apps/game` (styles, all HUD and menu components, a pixel icon component),
  `packages/content` (compendium registry and locale texts), `assets/icons`
  (Aseprite source and export), `tools/` (icon export script), `docs/assets.md`
  (asset register: Pixelify Sans OFL, original icons; Lucide, Barlow and Cinzel
  removed), visual baselines and HUD e2e tests.
- Player fantasy and core loop unchanged; no simulation change, determinism
  unchanged.
- Historical scope: the compendium only shows entries with a source reference
  and a confidence level from the project's history documents; Macaulay remains
  the baseline with its corrections listed. No new historical claims.
- Legal and ethical note: the photograph is public domain (verified by the
  user); Pixelify Sans is OFL; the icons are original. No quoted book passages.
- Perspective: not applicable (interface only); playable figures unchanged.
- Localization: every new string in PT-BR and EN, checked by
  `pnpm check:locales`.
- Non-goals: the low-poly art pass (phase 4), new historical research, sound,
  a mobile layout.
