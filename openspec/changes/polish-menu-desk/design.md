## Context

The desk from `add-menu-desk` renders each closed object as a PNG scaled by CSS
to a fixed box. Today the boxes give three different integer scales:

```
object        source      on screen   scale
-----------   ---------   ---------   -----
campaign      128 x 96    384 x 288     3x
compendium    128 x 96    384 x 288     3x
maps          128 x 120   384 x 360     3x
compass        48 x 48    192 x 192     4x
references    128 x 80    256 x 160     2x
gramophone    120 x 160   240 x 320     2x
```

The drop shadows use offsets of 3, 4, 5, 6 and 8 px. The drag grid is 2 px and
the keyboard steps are 8 and 32 px, neither a multiple of 3.
`DeskObject` already exposes `data-dragging` while a pointer drag is active,
and the desk is drawn over the marching menu video and the vignette, with no
table. The reference pile has no entry in `DEFAULT_SPOTS`, which breaks the
typecheck and leaves `defaultDeskPosition('references', …)` reading `undefined`.

This change touches presentation only. The simulation, its worker, commands and
determinism are not involved, and no 3D or low-poly asset changes.

## Goals / Non-Goals

**Goals:**

- Make 2x the only closed-object scale (D15), and derive every CSS box from the
  sprite's source size so the two cannot drift apart.
- Clean up the two books without changing how they read at a glance.
- Use one shadow token and one held-shadow token for every closed object.
- Keep every position and movement on the 2 px art grid.

- Keep each closed object where the player left it, whatever opens and closes.
- Turn both books into paged reading surfaces fed from data, with no prose in
  components.
- Bring the drafted compendium entries, the fourteen images and the eight
  campaign chapters into `packages/content`, validated like the existing
  registries.

**Non-Goals:**

- Integer scaling of the parchment inside the open spreads. The page area stays
  fluid to fit the viewport. The frame border is drawn at 2x.
- New desk objects, playable missions, and new research or images.
- Changing the book fallback, which keeps `book-menu.css` and `gramophone.css`.
  It reads the same compendium registry, so it shows the new entries as text,
  without the plates.

## Decisions

### D1. Target source sizes

Amended by D15 (2x standard):

```
object        source (new)   on screen   work
-----------   ------------   ---------   ------------------------------
campaign      128 x 96       256 x 192   cleanup of the current sprite
compendium    128 x 96       256 x 192   cleanup of the current sprite
maps          128 x 120      256 x 240   unchanged art; shadow only
compass        64 x 64       128 x 128   redraw at the finer pixel
references    128 x 80       256 x 160   redraw in the books' language
gramophone    120 x 160      240 x 320   cleanup; already at 2x
```

Every object keeps its proportion to the books, so the default arrangement keeps
its composition at a smaller size. Until the compass redraw lands, its 48 x 48
sprite is shown at 2x (96 x 96).

*Alternative considered (first version of this design):* 3x for every object,
with the pile, gramophone and compass redrawn at 3x. Superseded by D15.

### D2. Size from data, not hand-written CSS boxes

`deskArt.ts` stays the single place that knows each sprite's source size. The
desk object sets `--art-w` and `--art-h` from it, and CSS computes the box as
`calc(var(--art-w) * var(--desk-scale))`, with `--desk-scale: 2`. The per-object
`width`/`height` rules in `menu-desk.css` are removed. A unit test asserts that
every closed sprite's size in `DESK_ART` matches its PNG header, so a re-export
at another size fails the check rather than silently rescaling.

*Alternative considered:* keep per-object CSS boxes and fix the numbers by
hand. Rejected: that is how the 2x and 4x drift happened.

### D3. Cleanup pass for the books (trace, not redesign)

Work in Aseprite on top of the current 128 x 96 sprite as a locked reference
layer:

1. Keep the silhouette, the spine side and the cover hue (navy and green).
2. Reduce to `art-src/menu/desk-palette.pal`, with at most 4 shades per material
   (leather, page edge, gilt).
3. Replace dither noise with flat patches and a few hand-placed wear pixels.
4. Light from the top left: highlight on the top-left edges, shade on the
   bottom-right edges.
5. Add a dark 1 px outline (the palette's darkest brown, not pure black), with
   selective outlining on lit edges if it reads too heavy.
6. Trim the canvas so the lowest opaque pixel touches the bottom edge.

*Amended 2026-11-08 (apply):* the palette had no green leather, so a four-shade
green ramp (27 69 54 to 107 154 127) was added to `desk-palette.pal` for the
compendium. The pass is scripted in `tools/aseprite/desk-cleanup.lua` with a
hand-written colour map per sprite, and the drawn pieces in
`tools/aseprite/desk-draw.lua`, so they can be re-run from the backed-up
reference layers.

The redraws (references, gramophone, compass) follow steps 2 to 6. The
gramophone keeps a separate groove layer for the shimmer that already exists.

### D4. Shadows and the held state

Two CSS tokens, in art pixels times `--desk-scale`: `--desk-shadow`, two art
pixels (4 px at 2x), for resting objects, and `--desk-shadow-held`, three art
pixels (6 px), while held. The held state hangs on the existing
`data-dragging="true"` attribute. It adds a one-art-pixel lift (2 px) and a `steps(1)` transition of about
60 ms, so the drop is one dry step rather than an ease. Under reduced motion,
the `translate` is removed and only the shadow swaps.

Using `drop-shadow` (not `box-shadow`) keeps the shadow on the sprite's shape,
which suits a scattered pile.

### D5. One art-pixel grid everywhere

`DESK_GRID` in `deskLayout.ts` is the art pixel: 2 px at the 2x standard (D15).
`clampDesk` already snaps, and `loadDesk` runs stored positions through
`clampDesk` on measure, so layouts stored on another grid are snapped on load
without a storage key bump. The keyboard steps are 3 and 12 art pixels (6 px
and 24 px with Shift). `DESK_MARGIN` is 12, a multiple of the grid.

*Alternative considered:* bumping the storage key to `prestes.menu.desk.v2`.
Rejected: snapping is lossless enough, and keeping the key preserves the
player's arrangement.

### D6. Reference pile default spot

Add `references` to `DEFAULT_SPOTS`. The spot table found in the tree did not
reproduce the approved `desk-start-screen` baseline: its compass covered the
map fan's active sheet, and its pile overlapped both books. So the spots are set
from the baseline's measured positions instead:

```
campaign   { x: 0.03, y: 0.02 }    compendium { x: 0.03, y: 0.98 }
references { x: 0.03, y: 0.5  }    options    { x: 0.74, y: 0.02 }
maps       { x: 0.42, y: 0.28 }    gramophone { x: 0.86, y: 0.6  }
```

The record type stays `Record<DeskObjectId, …>`, so the compiler catches any
future object without a spot.

### D7. Open frame colours follow the cover

The open-book frame colour moves to a per-book custom property
(`--book-cover`, `--book-cover-deep`) set on the campaign (navy) and compendium
(green) objects. The open-book sprites are re-tinted to match, or their frame is
drawn in CSS over the parchment if the sprite tint fights the palette.

### D8. One grid in `add-menu-desk` and this change

`add-menu-desk` is still unarchived, and its delta names the drag grid. With the
2x standard (D15) both deltas say 2 px, so the archived main spec never holds two
grids. Archive `add-menu-desk` first,
then this change.

### D9. Open screens are overlays, not moved desk objects

Today `toggle` sets `centerOnMeasure`, and `handleMeasure` writes the centred
position into `layout` and saves it. That is why closing leaves the object in
the middle. Instead:

```
 desk layer (absolute, positions from layout)   overlay layer (fixed, centred)
 +--------------------------------------+       +---------------------------+
 | [campaign]   (hidden while open)     |       |   open campaign spread    |
 | [compendium] at layout.compendium    |  -->  |   (not in layout, not     |
 | [maps] ...                           |       |    draggable)             |
 +--------------------------------------+       +---------------------------+
          ^ position untouched                       z-order = open stack
```

- `MenuDesk` keeps `layout` for closed objects only, and `centerOnMeasure` is
  removed.
- Each open object renders its open content in an overlay root, centred with
  CSS grid. The closed art is not rendered while the object is open, and its
  slot keeps its position.
- The overlays are stacked by an `openOrder` array, with the last one in front.
  Escape closes the front overlay only.
- Measurement for clamping uses the closed size only, so opening never triggers
  a clamp on the closed position.

*Alternative considered:* remember the pre-open position and restore it on
close. Rejected: it still writes the centre to storage, so a reload while open
loses the position, and the open size would still feed the clamp.

### D10. Paged books driven by a page model

Both books render from a flat list of pages built by pure functions in
`apps/game/src/ui/menu/bookPages.ts`:

```
type BookPage =
  | { kind: 'title' } | { kind: 'contents'; section?: string }
  | { kind: 'plate'; image?: ImageRef; caption: ...; meta: ... }
  | { kind: 'text'; heading?: string; blocks: TextBlock[] }
  | { kind: 'briefing'; chapterId: string }
spreads = pairs of pages; ribbons map an id to a spread index
```

Prose is split at authoring time: each chapter section and each note paragraph
group is one `text` page, sized to a word budget that fits a page at
1280 x 720. An e2e check asserts that no page overflows at 1280 x 720 or at
1440 x 900, so a too-long page fails the build instead of scrolling. The text
is not measured and reflowed at runtime: that costs complexity and makes page
numbers unstable across viewports.

Page numbers come from the spread index, so a link to an entry or a chapter
resolves to a stable spread. Navigation is spread-by-spread: arrow keys, the
corner controls and the ribbons. Turning is a short CSS page-turn, which is
instant under reduced motion.

### D11. Spread visual layout

```
 +---[ribbons on the top edge: sections or chapters ]-------------+
 |+---------------------------+ +---------------------------+     |
 ||  LEFT: plate / meta       | |  RIGHT: text              |     |
 ||  +---------------------+  | |  Title          [label]   |     |
 ||  |  image (PixelPhoto) |  | |  date - place             |     |
 ||  +---------------------+  | |  body text 16-18px        |     |
 ||  caption                  | |  ...                      |     |
 ||  credit - licence         | |  sources - confidence     |     |
 ||                 p. 12     | |  p. 13          < >       |     |
 |+---------------------------+ +---------------------------+     |
 +----------------------------------------------------------------+
```

- The frame is a 9-slice of the book's cover colour at 2x, from
  `--book-cover`. The parchment fills the page.
- The spread caps at about 1152 px wide and keeps its aspect ratio, so the
  pages never become wide, empty fields.
- Type scale: 16 px body, 22 px title, 13 px for meta and sources. Body lines
  are 60 to 70 characters long.
- The plate uses the existing `PixelPhoto` treatment, which matches the
  shipped compendium images.

### D12. Content model and where the text lives

Short labels such as the ribbon names, "in preparation" and "contents" go into
the locale catalogs, as today. Long text does not: putting chapter prose and
extended notes into `en.ts`/`pt-BR.ts` would add thousands of lines to the
message catalogs. Instead:

- `packages/content/src/compendium.ts` gains the fields `label?` and
  `images?: ImageRef[]`. Short bodies stay in the catalogs. The place, extended
  note and image captions and credits live in
  `packages/content/src/compendium-notes/{en,pt-BR}.ts`, keyed by entry id and
  image slot. The label, confidence, sources and images recorded in the docs
  are in `compendium-docs.ts` and applied over the base registry.
- `packages/content/src/campaign/chapters.ts` holds the registry (id, number,
  date, place, commanderId, label, sourceRefs, image, links, playable).
  `packages/content/src/campaign/text/{en,pt-BR}.ts` holds each chapter's title,
  perspective, pages and briefing.
- `ImageRef` is `{ slot, path }`; the licence and rights come from the register
  mirror, and the caption and credit from the long text. `path` must appear
  in the asset register. A small generated or hand-kept list in
  `packages/content` mirrors the register's compendium rows, so the content
  check does not parse Markdown at runtime.
- `tools/check-content.ts` adds checks for chapters, links, commanders, images
  and locale parity of the long text.

The docs remain the authoring source. Each doc entry and chapter gets
`status: applied` and a pointer to its runtime id once copied, and later edits
go to both, as `CAMPAIGN.md` already asks.

### D13. Figures and commanders

`figures.ts` gains `miguel-costa` and `isidoro-dias-lopes` with
`playable: false`, roles and sources from `FIGURES.md`. Chapter commanders
resolve to the figure registry. Because no chapter is playable, the existing
rule that a mission needs a playable commander is not triggered. The campaign
registry is separate from the mission registry, so the two current missions are
untouched.

### D14. Images per chapter

| chapter | plate image |
| --- | --- |
| prologue | `revolt-1922/hero-photo.png` |
| 2 anel-de-ferro | placeholder emblem (no registered image) |
| 3 a-divisao | `foz-do-iguacu/group-photo.png` |
| 4 frente-do-parana | `map-fazenda/hero-photo.png` |
| 5 ponte-de-verdinho | placeholder emblem |
| 6 serra-nova | placeholder emblem |
| 7 pantanal | `luis-carlos-prestes/column-photo.png` |
| 8 la-gaiba | placeholder emblem |

The placeholder is one drawn section emblem, registered as a placeholder in
`docs/assets.md`. It is not a historical image and is not described as one.

### D15. 2x desk standard on every screen (amended 2026-11-07)

At 3x the default desk did not fit a 1280 x 720 view: the reference pile covered
the campaign label, the map fan overlapped the campaign book and the gramophone
covered the Options label. The owner chose a smaller desk for every screen, with
everything at about the same scale. `--desk-scale` and `DESK_SCALE` are 2 at
every width, the narrow drawer included, and every closed sprite, the compass
and the reference pile included, is drawn at 2x, so `PENDING_REDRAW` is empty.
The drag grid, keyboard steps, shadow and lift follow in art pixels (D4, D5).
The open screens are unchanged.

*Alternatives considered:* 2x only on short viewports, keeping 3x at 1440 x 900
(rejected by the owner: one scale everywhere); accepting the overlap at
1280 x 720.

## Risks / Trade-offs

- [The cleanup makes the books lose the charm the owner likes] → The current
  sprites stay as a locked reference layer, and the owner reviews a side-by-side
  before export. If a book reads worse, keep the current sprite with only the
  outline and palette steps.
- [The outline reads too heavy over the dark vignette] → Use the darkest
  palette brown and selective outlining. The visual baseline is reviewed over
  the real video, not only over the hidden-video test frame.
- [The visual tests hide the menu video, so legibility over the march is never
  tested] → Add a manual check task over the live scene, and keep the automated
  baselines for scale and alignment only.
- [Snapping old positions moves objects by up to 1 px] → Acceptable. It is
  invisible at 2x.
- [Open spreads stay fluid, so their pixels are not exactly 2x] → Only the
  parchment is fluid. The frame border is a 2x 9-slice.
- [At 2x the map sheet's parchment strip cannot hold the map description at a
  readable size] → The closed fan's legend shows the title and the deploy
  stamp; the description stays in the accessibility tree and the legend's
  tooltip, and the narrow drawer shows it in full.
- [Draft historical text reaches players] → Only entries and chapters with
  sources and a confidence ship. Low confidence is shown on the page. Open
  questions in the docs that block a claim keep that claim out of the runtime
  text.
- [Docs and runtime text drift apart] → The docs are marked `applied` with
  their runtime id. The content check verifies every doc entry id exists in the
  registry.
- [Word budgets fit one viewport but overflow another] → The overflow check runs
  at two viewports. The budget is tuned at the smaller one.
- [PT-BR extended notes are missing where the docs have only English] →
  Translate them as part of the import. The parity check fails until both
  exist.

## Migration Plan

1. Land the default-spot fix (D6) and the position fix (D9) first. They are
   bugs and stand on their own.
2. Land the size-from-data CSS, shadows, held state and grid with the current
   PNGs re-exported at their new sizes as they become ready. Each sprite swap is
   one commit with its visual baseline update.
3. Land the content registries and checks (D12, D13), then the page model and
   the spreads (D10, D11). The book fallback picks up the new compendium entries
   automatically.
4. Rollback: each sprite swap reverts on its own. `?menu=book` stays as the
   full fallback.
