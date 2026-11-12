## Context

See proposal.md. The reference is
`referencias para hud/Interface de comando da Coluna Prestes.png`
(1790 x 878); the side-by-side with today's HUD at the same size is
`referencias para hud/comparacao/hud-referencia-vs-atual.png`.

What the reference shows, element by element, against today's HUD:

| Reference | Today | Here |
|---|---|---|
| Brand: flag emblem, "PRESTES / BARRA DE COMANDO", lantern | Brand text only | Kept, framed, emblem and lantern added |
| Camera rail: TÁTICA (active, rust red) / ESTRATÉGIA | Same buttons plus "Banda: Tática" text | Text label dropped (the active button says it); strategic layer switches added beside it in the strategic band |
| Centre: three objective badges and the clock 19:37 | Letter badges with pips, clock | Same data in brass badges |
| Right rail: language, Sair, pause, 0.5x 1x 2x 4x, Rotas, Pós-Forte | Same, plus the sandbox (tool) button | Same; sandbox button removed (owner, `remove-sandbox-panel`) |
| Compass in a brass bezel, top right | Compass (`add-map-compass`) | Bezel art only |
| TROPAS, top left, tall list: portrait slot, name, army, "Vivos: N", three bars, scroll bar | Troops window, bottom left, three cards visible | Docked top-left, five cards at reference size; portrait slot takes `troop-thumbnails-and-panel`'s thumbnail |
| RESUMO DA TROPA, bottom left, parchment on wood, hat and canteen: name, army, ten soldier figures, weapon and rounds, five status icons, two text lines | Troop summary window, dark, helmets and bars, weapon card, text lines | Docked bottom-left, parchment; soldier figures from `troop-thumbnails-and-panel`; weapon card kept |
| ORDENS, right, column: movement, fire and manoeuvre, position, posture, body, pace, fire, formation; "..." menu | Orders window, bottom centre, two rows, can be a column | Docked right as a column; "..." keeps today's window menu items that still apply |
| No status row | Selection / order / body row, concealed, revealed, ferry, pending prompt and Cancel | Moved (D5) |
| "SUA TROPA" tag over the selected section | Same | Unchanged |
| Bottom strip: bedroll, Mauser, ammunition box, first-aid kit, canteen, grass | None | Decorative only (owner) |

Palette sampled from the reference (finalised at apply): frame wood
`#302817`/`#3d2817`, card ink `#281c11`, gold titles `#ffc244`/`#eeae40`,
active rust `#82421d`, light button `#c9a373`, parchment `#cf9758` with
ink `#100d07`. These become `--px-*` tokens beside today's sepia ones.

## Goals / Non-Goals

**Goals:**

- The reference's look and layout with every function the HUD has today.
- No control lost, no test id lost; every label in PT-BR and EN.
- The map stays as visible as today at 1280 x 720.

**Non-Goals:**

- Drawing the section thumbnails or the troop panel's header, gauges and
  alerts (`troop-thumbnails-and-panel`).
- Making the ornaments show game state (owner: decoration only).

## Decisions

**D1. Art in Aseprite, nine-sliced.** The owner asked for the art to be
drawn in Aseprite and allowed the reference image to be used and
rasterized (2026-11-11). `assets/hud/prestes-hud.aseprite` holds one
named slice per frame (top rail, wood panel, parchment card, title plate,
collapse tab, button idle/hover/active/disabled) with its nine-slice
centre set in Aseprite, and one per ornament. A Lua script under
`tools/hud/` seeds the file: it crops each element from the reference,
scales it down to the reference's pixel grid (its art reads at about 2
screen pixels per art pixel), indexes it to the HUD palette and lays it
out as slices; after that the file is edited in Aseprite and the script
is not re-run over it (as `pnpm icons --grids`). `pnpm hud-art` exports the
sheet and its JSON (slices with centres) to `apps/game/src/assets/`,
committed so building and testing do not need Aseprite. CSS
`border-image` with `image-rendering: pixelated` scales the frames by
whole pixels (2x at the reference size, 1x below 1440 wide). Frames are
cleaned to tile without seams: the crop is a starting point, not the
final art. Ornaments have `pointer-events: none` and sit in the frame's
margin, never over a control.

**D2. Soldier figures belong to `troop-thumbnails-and-panel`.** The
owner's figure (helmet colour = cover in four classes: none, light, good,
inside a position; body colour = health; a five-round cartridge clip
under him = ammunition; a mark for pinned or routed) replaces that
change's "Soldier rows" (owner, 2026-11-11). It lands before this change;
here the Troop summary only frames it on parchment. Its sprite is drawn
in the same Aseprite file as this change's art if this change's file
exists by then, otherwise in that change's own source.

**D3. Docked panels replace floating windows.** A `DockedPanel`
component replaces `FloatingWindow`: a fixed anchor (top-left,
bottom-left, right), a title plate with a collapse button, and a
collapsed state that leaves only the title tab against its edge (Troops
folds up toward the top bar, Summary and Orders fold down). The collapsed
states persist under a new storage key; the old `windowLayout` key is
ignored, not migrated. Free drag and resize go: the layout is fixed so the
art fits. Panels shrink to fit below 1440 x 900 (fewer troop cards
visible, inner scroll).

**D4. Type size.** Titles 16 px, labels 12 px, data 11 px at the
reference size (Pixelify Sans' crisp sizes), down one step below
1440 wide. Checked by the existing overflow e2e in both locales at
1280 x 720 and 1790 x 878.

**D5. The command status row is redistributed.** Selection count
(`selection-count`) and current order (`order-value`) go to the summary
header; body stance (`stance-value`) is already shown by the active body
button and stays as hidden text for tests and screen readers; concealed,
revealed and ferry become badges in the summary under the figures; the
pick prompt (`order-hint`) and Cancel (`order-cancel`) become a banner at
the top centre of the map, under the clock, where the eye is when picking
a point. The order queue stays under the orders column.

**D6. Strategic layers.** Two toggles on the camera rail, shown only in
the strategic band: contours and cover. Contours reuse
`painted-ground.ts`'s `contours` overlay (1 m lines, bold every 5 m). The
cover layer moves the editor's slot dots and vegetation hatch out of
`apps/game/src/editor/viewport.ts` into a view3d layer used by both, fed
with the battle's own compiled map. Fog of war: the layer shows the
ground's slots and concealment only, never who holds a slot. Both toggles
start off in every battle; switching to the tactical band hides the
layers and switching back shows them again while their toggle is on. Key
bindings: none in the MVP.

**D7. One visual baseline refresh.** Baselines of the battle HUD, the
orders column and the preview HUD are refreshed once, in the task that
lands the layout, and reviewed against the reference side by side.

## Risks / Trade-offs

- [Wider panels cover more map] → Troops and Summary share the left
  edge, Orders the right; the centre of the map is free as today; each
  panel collapses to a tab.
- [Players who moved windows lose their layout] → accepted; the fixed
  layout is the reference.
- [Art drawn in code looks flatter than the reference] → the frames'
  sizes and palette are fixed first; the ornaments can be redrawn by hand
  later without touching the layout.
- [Conflicts with open changes in the same files] → applied after
  `scrub-concealment-and-area-fire` and `troop-thumbnails-and-panel`;
  this change restyles their frames and does not move their logic.

## Open Questions

Answered by the owner on 2026-11-11: the soldier figure goes into
`troop-thumbnails-and-panel`; the art is drawn in Aseprite and may start
from the reference image; the bottom strip is decoration only; the helmet
has four cover classes; the sandbox is retired (`remove-sandbox-panel`).
None left open.
