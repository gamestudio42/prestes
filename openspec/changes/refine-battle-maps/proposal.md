## Why

The battle maps are playable and the user liked them (2026-11-05), but a fine
review is due before more is built on them. The headless battle report shows
two maps whose fights are decided and never end: on Serra e Rio and in the
Bairro the last enemies hide and nobody hunts them (15 minutes, outcome
none). Bairro runs at 3.9 ms a tick against a 3 ms budget. The kits are grey
placeholders: the Bairro's quintal walls read as stone blocks, fences are
thin posts, the vendas look like the houses. The camera opens far from the
player's sections, the deployment zones are not shown, and the skirmish
page lists maps by name only.

After playing the Fazenda (2026-11-05) the user added: the cornfield and the
capim do not look right, the roads look strange, the map is too open, and
the roads should have roadside ditches (valas for rain water) where soldiers
can take cover. After playing Serra e Rio the user added: the shading of
the hills looks strange, the ford looks wrong, the capim should grow along
the riverbanks, and grass blades should read as blades, not as little pine
trees, while keeping the massed look it has from afar.

## What Changes

- **A decided battle ends.** A side reduced below a fifth of its starting
  strength with no contact for 60 s falls back off the field (its fit men
  rout toward their map edge), and the battle ends. Before that, the side
  that is winning searches: its idle sections sweep the last known enemy
  positions, then the concealing vegetation, enclosed yards and crossings
  near them.
- **Performance**: every battle map under 3 ms a tick with the default
  rosters (Bairro today 3.9 ms).
- **Period look of the kits** (named placeholders improved; the Blender kits
  stay a later task): plastered brick walls with a coping and wooden board
  fences in the Bairro, wire-and-post fences on the Fazenda, houses with a
  door on the street and tiled roofs, vendas with a wide door and an awning,
  a matriz with a façade and tower, a coreto with its roof on posts; trench
  bays dug into the Fazenda's ground; gravel and reeds on the riverbanks.
- **Roads with ditches.** Dirt roads are sunk slightly into the ground with
  cambered verges and a drainage ditch (vala) on one or both sides: a
  0.8 m deep, 1.5 m wide channel that gives cover like a shallow trench
  (crouched and prone) and slows movement along its floor. The roads
  themselves are drawn as rutted earth with grass on the crown, following
  the ground, not as flat ribbons.
- **More cover on every map.** Each map gets the period clutter that breaks
  open ground: stone and taipa field walls, hedgerows and bamboo clumps,
  woodpiles, carts, haystacks, a water trough, termite mounds and fallen
  logs on the Fazenda; rock outcrops, gullies and fallen trees on Serra e
  Rio; carts, barrels, sacks and a tram stop in the Bairro. Target: no
  stretch of more than 60 m on an attack axis without a cover slot.
- **Crops and grass that read right.** Corn as rows of stalks with leaves
  and tassels (rows 0.9 m apart, aligned with the field), cane as dense
  segmented stalks with a ragged top, capim as soft clumps of blades that
  sway, all as instanced low-poly cards; fields get a visible edge (a
  headland path) and their soil colour.
- **Serra e Rio look.** Terrain shading without banding: smooth vertex
  normals on the heightfield, a softer toon ramp for slopes and a sun angle
  that models the hills; the ford as a gravel bar with stones, lighter
  shallow water and ripples, readable from above; capim moved to the
  riverbanks and the veredas (with buriti), drawn as blade cards in dense
  clumps.
- **Concealed fire at range (bug found 2026-11-05).** Men lying in the capim
  near the bridge were "discovered": a headless reproduction showed they
  were not seen, they opened fire (free fire, the default) at enemies about
  117 m away, and every shot reveals the shooter for 4 s to anyone with a
  line of sight. Firing from concealment will reveal the shooter only to
  observers within 50 m; farther observers get the unseen-fire "?" marker
  instead. Concealed sections switch to "fogo ao contato" (hold fire until
  an enemy is within 60 m) unless the player has set their fire control,
  and the soldier ring and HUD show "Revelado" for the seconds a man is
  given away.
- **Battle start**: the camera opens at tactical zoom on the player's
  sections; the deployment zones and the enemy's side are marked for the
  first 10 s; Home frames the whole map.
- **Map previews**: the skirmish page shows a small pixel preview of each
  map, an original top-down render produced by a project tool.
- **Fine review fixes** found by a structured per-map review (checklist in
  `design.md`): crossings and their approaches, lines of fire, cover
  density, dead ends in the town's quintais, crop edges, props out of
  bounds; every flagged item fixed or logged.
- New strings in PT-BR and EN.

## Capabilities

### New Capabilities

None. (`battle-maps` arrives with `add-battle-maps`.)

### Modified Capabilities

- `battle-maps`: start view and deployment marks, map previews, the period
  look of the placeholders, the per-map performance budget.
- `battle-lab`: a decided battle ends; the winning side searches for hidden
  survivors.

## Impact

- `packages/simulation` (commander search, decided-battle rout and outcome),
  `packages/shared/src/maps/*` (review fixes), `packages/view3d`
  (placeholder kits, trench cuts, banks, deployment marks, camera start),
  `apps/game` (skirmish page previews, Home key), `tools/` (map preview
  renderer, battle report bands per map), `apps/game/public/maps/` (preview
  images), tests, asset register.
- Depends on `add-battle-maps` (archive it first). Independent of
  `pre-battle-roster`; whichever lands second re-records its goldens.
- **Player fantasy**: the same, with fights that finish and towns that look
  like 1920s Brazil.
- **Historical scope**: no new claims; the look follows the existing
  settings. No real building, brand or shop name is shown.
- **Multi-perspective**: unchanged.
- **Legal and ethical note**: none beyond the standing rules; previews are
  rendered from the game's own scenes.
- **MVP**: battles end on all maps within the bands; 3 ms on all maps;
  improved placeholders; start view and marks; previews; review fixes.
- **Non-goals**: the Blender kits, new maps, weather and night, a minimap,
  destructible scenery.
