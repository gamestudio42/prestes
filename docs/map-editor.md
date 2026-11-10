# Map editor

The map editor builds battle maps for Prestes in the browser. On the game's
menu desk, choose the theodolite (**Map editor**); or start the dev server
(`pnpm dev`) and open `http://127.0.0.1:5173/editor.html`. The interface follows the game's language
(English or Portuguese); switch it at the top right.

## Maps

- **New map**: file name (lowercase words joined by hyphens, it becomes
  `<id>.map.json`), size, names and descriptions in both languages, use
  (skirmish or campaign), setting, source note, palette, base ground and
  water level.
- **Sizes**: small 240 m, medium 400 m, large 640 m across. Changing the size
  in **Map properties** grows the map around its centre or crops it; objects
  that would fall outside are listed first and removed only if you confirm.
- **Autosave**: the open map is kept in the browser a moment after each edit
  and reopened next time. **Export** downloads `<id>.map.json`; **Import**
  opens one (a damaged or foreign file is refused and the map stays as it was).
- **Save to project** (dev server only) checks the map and writes it into
  `packages/shared/src/maps/authored/`. Campaign maps need a source note that
  cites `docs/history/SOURCES.md`. Commit the file like any other change.

## Viewing

- Mouse wheel zooms, right or middle drag pans, W A S D (or the arrows)
  move the camera and Q E turn it, as in battle; Home frames the whole map.
- **Top-down** looks straight down; **Grid** draws metres.
- **Relief** colours the ground by height (green low, yellow, brown, pale
  top), shades it as lit from the north-west and draws a contour line every
  1 m, bold every 5 m; the status bar shows the lowest and highest ground.
  It comes on by itself when you pick a terrain tool. **Contours** draws the
  lines alone, **Slope** marks ground that slows (yellow) or stops (red) men.
- **Cover** shows the cover the game will use (it can be on with any of the
  views above):
  - a dot for every place a man takes cover, the same places the battle
    uses. Green hides a standing man, yellow a crouched one, orange only a
    prone one. Trenches and road ditches hide a crouched man; other cover
    hides the stances whose eye height it reaches (1.6 m standing, 1.0 m
    crouched);
  - a badge with the number of places on each object, wall, road ditch and
    trench line; zoomed out past about 160 m, the badges in each 50 m square
    add up into one;
  - concealing vegetation hatched;
  - in the side panel, the places inside each side's deployment area;
  - pointing at a piece rings its places, draws the arc each one guards, and
    gives its name and count in the panel.

## Tools

| Tool | Use | Keys |
| --- | --- | --- |
| Select | click an object or a point, drag to move, drag on empty ground for a box | V; Del deletes, Ctrl+D duplicates, Shift adds |
| Texture brush | paint ground; basic colours for large areas, detailed textures for finish | B; Shift+drag erases; [ ] size |
| Fill / Eraser | fill one connected material / paint back the base ground | G / C |
| Raise, Lower, Smooth, Flatten, Set height, Noise | shape the 2 m height grid (−12 to +40 m); a big noise brush rolls hills, a small one roughens | H, M, F |
| Road | click points, Enter or double-click to finish; type, width, ditches | R; Esc cancels, Backspace removes the last point |
| River, Pond, Bridge, Ferry | water (deep or ford) and its crossings; a bridge and a ferry take two clicks | |
| Wall or fence | taipa, dry stone, plastered brick, wire, board, picket, hedgerow | L |
| Trench | drawn like a road, any length; fire or communication, 1.2 m or 0.8 m deep, parapet side, firing bays, earth or sandbag parapet | T; X flips the parapet side |
| Place object | buildings, stones, trees and plants, posts, covers, props, ground decals | O; R rotates (Shift+R back) |
| Trees | scatter a biome's mix at a density, place one species, or erase trees under the brush | Y; [ ] size |
| Vegetation | corn, sugarcane, capim, scrub (they conceal men inside) | P |
| Deployment | drag each side's three section points; drag an area's corners, or the whole area from inside; double-click an edge to add a corner | K; Del removes the selected corner (three stay) |

**Deployment areas** (document version 3): each side has one area, a
polygon where its men may be placed before the battle. Older documents open
with a default area: the side's half of the map, cut a margin short of the
middle. Areas are drawn in the side's colour.

**Roads** paint their surface and leave the ground as you shaped it; shape
the relief first with the terrain tools. A road's ditches still dig their
channel and give the cover of a shallow trench.

**Trenches**: a fire trench has a fire step along the side of its parapet
(ticks on the line show which side; X flips it). It shelters only from that
side, and its men stand one every 1.2 m; the panel shows the trench's
length, cover places and how many men it holds. A communication trench
shelters from both sides but has no fire step and no cover places. Firing
bays put a traverse every 10 m.

**Trees**: scatter paints the chosen biome's mix (Atlantic forest edge,
cerrado, caatinga, pasture) at sparse, medium or dense spacing, never in
water, on roads or against buildings and other trees. One stroke is one
undo step, and the same stroke on the same map always gives the same trees.
Single places the species picked in the list; erase removes trees only.

**Plants grow only on land**: vegetation painted over water, a bridge, a
paved or cobbled road, a building or a trench is not drawn, and **Check
map** warns about it.

Every object counts in battle. The side panel shows what the chosen object
does: whether it blocks movement or sight, its cover value, whether it
conceals, or only paints the ground. Small rocks only cover a prone man; a
boulder hides a standing one; posts and cacti stop no bullet; walls under
1.2 m do not cover a standing man.

## Checking and playing

- **Check map** lists errors and warnings (missing names, sections off the
  map or in water, no path between the sides, overlapping buildings, bridges
  not over water, long open ground, a section outside its deployment area,
  areas that overlap, an area less than half walkable). Click a problem to
  go to it.
- **Playtest** saves the map, opens the 3 vs 3 on it in the deployment
  phase (bound by the map's areas), and offers "Back to the editor" at the
  top of the screen and at the battle's end.
