## Why

The battle HUD works but reads as a debug overlay: three small dark
floating windows with drag handles, 8 to 10 px text, a placeholder square
for every section portrait, and a troop summary whose helmets and bars
cannot be read without hovering. The owner drew the HUD he wants in
`referencias para hud/Interface de comando da Coluna Prestes.png`
(2026-11-11): the same functions dressed as a field commander's kit, with
wood and leather frames, a parchment troop summary, gold pixel headings,
docked panels at the edges of the screen and a decorated bottom edge. He
also asked (2026-11-11) for:

- the panels to stay docked and only collapse: the orders and the troop
  summary fold down, the troop list folds up; no free resizing;
- each soldier in the troop summary drawn as a small figure whose helmet
  colour tells his cover, whose body colour tells his health, with his
  ammunition as a cartridge-shaped counter under him;
- in the strategic view, switches for a contour-line layer and a cover
  layer like the map editor's, off by default.

## What Changes

- **Field-kit art for the battle HUD**: wood and leather panel frames
  drawn as pixel nine-slices, gold pixel-caps titles, a parchment card for
  the troop summary, the brand with the national flag emblem, a brass
  compass bezel, and ornaments (lantern, cloth drapes, a slouch hat, a
  canteen, a bottom strip with a bedroll, a Mauser, an ammunition box and a
  first-aid kit), decorative only. Drawn in Aseprite (one slice per frame
  and ornament, exported sheet committed), traced or rasterized from the
  owner's reference where that serves, with the owner's permission
  (2026-11-11); recorded in the asset register. Ornaments never cover a
  control, take a click or show game state.
- **New layout** at the reference size (1790 x 878, usable down to
  1280 x 720): the top bar as framed rails (brand, camera band, objectives
  and clock, language, leave, pause and speed, routes, post); **Troops**
  docked top-left as a tall list; **Troop summary** docked bottom-left;
  **Orders** docked right as a column of labelled groups (movement, fire
  and manoeuvre, position, posture, body, pace, fire, formation).
- **Docked panels that collapse, not float**: no dragging, no resizing.
  Each panel collapses to its title tab toward its edge (Troops up,
  Summary and Orders down) and the state is remembered. The saved floating
  layout of earlier builds is ignored.
- **Larger type**: titles and labels sized as in the reference, checked
  for overflow in PT-BR and EN at 1280 x 720.
- **No sandbox button** in the top bar: the owner retired the sandbox
  (2026-11-11, "today we have the map editor"); its panel, F1 and the
  rest go in the separate change `remove-sandbox-panel`.
- **The command status row goes**: selection count and current order move
  to the summary header; concealed, revealed and ferry counts become small
  badges in the summary; the "click on the map" prompt and its Cancel move
  to a banner at the top centre of the map. Test ids are kept.
- **Strategic map layers**: in the strategic band, two switches turn on
  contour lines and the cover layer (slot dots by the stance they protect,
  concealing vegetation hatched), drawn as the editor draws them. Both are
  off at the start of every battle and hidden in the tactical band.

Design intent. Player fantasy: an officer of the Column reading his
sections off a field desk. Pillar: readable tactics, period identity.
Loop beat: the moment-to-moment read of the battle (who is in cover, who
is hurt, who is running dry) and the strategic look at the ground before a
move. Hypothesis: a player finds the man without cover or without
ammunition in the selected section at a glance, and reads where the high
ground and the cover are without leaving the battle.

MVP: frames and layout, docked collapse, the status row moved, the two
strategic layers. Non-goals: the section thumbnails, roster cards, header
totals, soldier figures, gauges and alerts of `troop-thumbnails-and-panel`
(this change gives them their frame; it does not draw them); new orders or
simulation values; a minimap; a HUD for the map editor.

Relation to `troop-thumbnails-and-panel`: kept separate and in the planned
order (`soldier-animation-and-textures`, then `troop-thumbnails-and-panel`,
then this change). The owner's soldier figure (helmet colour = cover, body
colour = health, a cartridge counter under him = ammunition) goes into
that change in place of its "Soldier rows" (owner, 2026-11-11), so it is
built once and lands first; this change frames it.

Historical and ethical note. The flag emblem is the national flag, carried
by the Column and by the government forces alike; the ornaments are
generic kit of the 1920s backlands (slouch hat, canteen, Mauser, bedroll)
from `docs/history/FORCES.md` and `WEAPONS.md`. No named person, faction
insignia or claim is added. The playable perspectives are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: battle HUD art, layout, docked panels, soldier figures,
  order prompt and strategic map layers; the floating windows, the
  rounded translucent panels and the command status row are replaced;
  the sandbox button goes.

## Impact

- `apps/game/src/ui/Hud.tsx`, `ui/hud/*` (TopBar, SquadCards,
  TroopSummary, WeaponCard, CommandRow, OrderBoard's frame only),
  `ui/FloatingWindow.tsx` and `ui/windowLayout.ts` (replaced by a docked
  panel), `styles/command-hud.css`, `command-deck.css`, `pixel.css`
  tokens.
- `assets/hud/prestes-hud.aseprite` (new) with a Lua build script under
  `tools/hud/` and `pnpm hud-art` (as `pnpm icons` does), exported to
  `apps/game/src/assets/hud.png` and `hud.json`; `docs/assets.md`.
- `packages/view3d`: the strategic layers reuse
  `painted-ground.ts`'s contour overlay and move the editor's cover-dot
  drawing (`apps/game/src/editor/viewport.ts`) into a shared layer.
- `packages/content`: new HUD keys in PT-BR and EN.
- Tests: `tests/hud/window-layout.test.ts` replaced, e2e `battle-hud`,
  `hud-windows`, `preview-hud`, `visual` and their baselines.
- Depends on `remove-sandbox-panel` for the top bar without the sandbox
  button (either order works; whichever lands second drops the button).
- Files other open changes touch (`OrderBoard.tsx` by
  `scrub-concealment-and-area-fire`, `TroopSummary.tsx`/`SquadCards.tsx`
  by `troop-thumbnails-and-panel`): this change applies after them and
  only restyles their frames.
