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

- Mouse wheel zooms, right or middle drag pans, Home frames the whole map.
- **Top-down** looks straight down; **Grid** draws metres.
- **Relief** colours the ground by height (green low, yellow, brown, pale
  top), shades it as lit from the north-west and draws a contour line every
  1 m, bold every 5 m; the status bar shows the lowest and highest ground.
  It comes on by itself when you pick a terrain tool. **Contours** draws the
  lines alone, **Slope** marks ground that slows (yellow) or stops (red) men.

## Tools

| Tool | Use | Keys |
| --- | --- | --- |
| Select | click an object or a point, drag to move, drag on empty ground for a box | V; Del deletes, Ctrl+D duplicates, Shift adds |
| Texture brush | paint ground; basic colours for large areas, detailed textures for finish | B; Shift+drag erases; [ ] size |
| Fill / Eraser | fill one connected material / paint back the base ground | G / E |
| Raise, Lower, Smooth, Flatten, Set height, Noise | shape the 2 m height grid (−12 to +40 m); a big noise brush rolls hills, a small one roughens | H, S, F |
| Road | click points, Enter or double-click to finish; type, width, camber, ditches | R; Esc cancels, Backspace removes the last point |
| River, Pond, Bridge, Ferry | water (deep or ford) and its crossings; a bridge and a ferry take two clicks | |
| Wall or fence | taipa, dry stone, plastered brick, wire, board, picket, hedgerow | W |
| Place object | buildings, stones, trees and plants, posts, covers, props, ground decals | O; R rotates (Shift+R back) |
| Vegetation | corn, sugarcane, capim, scrub (they conceal men inside) | P |
| Deployment | drag each side's three section points | D |

Every object counts in battle. The side panel shows what the chosen object
does: whether it blocks movement or sight, its cover value, whether it
conceals, or only paints the ground. Small rocks only cover a prone man; a
boulder hides a standing one; posts and cacti stop no bullet; walls under
1.2 m do not cover a standing man.

## Checking and playing

- **Check map** lists errors and warnings (missing names, sections off the
  map or in water, no path between the sides, overlapping buildings, bridges
  not over water, long open ground). Click a problem to go to it.
- **Playtest** saves the map, opens the 3 vs 3 on it, and offers "Back to the
  editor" at the top of the screen and at the battle's end.
