## Why

The user asked (2026-11-05) for the first three real battlefields, set in
1920s Brazil: a wide rural map with trenches, farms and crops (corn and
sugarcane) where crouched soldiers vanish from sight; a mountain map with a
river crossed at three points and tall grass; and an urban map. Today the
3v3 is fought on one flat 240 m test field built from a handful of ellipse
features, and fog of war (in flight) has nothing in the land to hide behind.
Maps are where fog of war, cover and formations become choices.

## What Changes

- **Map catalog**: a battle map becomes one data definition read by both the
  simulation and the view: bounds, height, surfaces, water, vegetation,
  buildings, covers, sight obstacles, deployment zones and props. The current
  Vila Militar field stays as the default map, unchanged.
- **Three new maps** for the 3v3, chosen on the start menu and in the
  sandbox:
  - **Fazenda** (rural, 400 × 400 m): open pasture and coffee rows, a
    farmhouse, colonist houses and a sugar mill, a cornfield and a
    canefield, fences and a dirt road, and two opposed trench lines.
  - **Serra e Rio** (mountain, 400 × 400 m): two hill masses, a river
    across the map that cannot be waded, three crossings (a ford, a wooden
    bridge and a cable ferry), tall grass (capim), cerrado scrub, buriti
    palms along the banks and rock outcrops.
  - **Bairro** (urban, 320 × 320 m): a working-class and factory quarter in
    the style of São Paulo in 1924: terraced houses, a brick factory with a
    chimney, a church and square, cobbled streets with tram rails, a rail
    embankment and barricades.
- **Terrain relief**: height comes from a per-map heightfield, so hills,
  slopes, valleys and riverbanks are real. Terrain blocks line of sight and
  fire, as the fog-of-war change left for this one.
- **Water**: deep water is impassable; shallow fords slow movement and
  deny cover; a bridge is a narrow walkable deck; a ferry carries a few
  soldiers at a time between its landings.
- **Concealment**: crops, tall grass and scrub hide soldiers. A soldier
  crouched or prone inside a cornfield or canefield is not seen beyond a few
  metres, and sight lines across tall crops are cut. Concealment is not
  cover: bullets go through stalks. Firing gives the position away for a
  short time. Moving through crops is slow and noisy.
- **New surfaces and speeds**: dirt road, cobbles, pasture, crop, tall
  grass, scrub, ford, mud and floor (inside a trench), each with a speed
  factor.
- **Per-map deployment**: each map defines both sides' deployment zones and
  defensive lines, about 180 m apart, and the enemy commander's "advance on
  their line" fact.
- Map names, descriptions and terrain labels are localized in PT-BR and EN.

## Capabilities

### New Capabilities

- `battle-maps`: the map catalog and definition, map choice, bounds,
  deployment and the three maps' required content.
- `concealment`: vegetation that hides soldiers by stance, cuts sight
  lines, and is given away by firing.

### Modified Capabilities

- `terrain`: per-map heightfield, terrain line-of-sight blocking, water and
  crossings, new surfaces and speeds.
- `battle-lab`: the 3v3 starts on a chosen map; deployment and defensive
  lines come from the map.

## Impact

- `packages/shared` (map definition and catalog, heightfield sampling,
  surfaces, water, concealment queries, per-map pathfinding grid),
  `packages/simulation` (map selection, vision and fire through terrain and
  concealment, ferry, deployment), `packages/view3d` (heightfield ground
  mesh, water, crop and grass fields, new low-poly kits), `apps/game` (map
  picker, sandbox map choice), `packages/content` (locales), tests and the
  asset register. New maps get their own determinism goldens; the default
  map's golden must not change.
- Depends on `fog-of-war`: concealment and terrain blocking plug into its
  per-side vision. Fog of war should be archived first.
- **Player fantasy**: a tenente reading ground. Sending a section crouched
  through the cane to flank a trench, holding the ford with two rifles,
  clearing a street house by house.
- **Core loop**: pick a map, read its ground (heights, crossings, crops),
  place sections, move under fog, fight for the key ground, end the battle.
- **Historical scope**: the maps are fictional places, built to be
  plausible for 1922–1927 Brazil: a coffee and cane fazenda of the
  São Paulo and Paraná interior with the trench lines of the 1924–1925
  Paraná front; the rivers and highlands of the march through Goiás and
  Minas; and a São Paulo factory quarter like those fought over in July
  1924. Each map labels its setting as historical setting, fictional place.
- **Multi-perspective**: the maps are skirmish battlefields for the 3v3,
  not campaign missions. No historical figure commands on them; campaign
  missions will reuse these kits with their own commander.
- **Legal and ethical note**: the urban map evokes a city where the 1924
  fighting and the legalist bombardment killed and displaced civilians.
  The map shows no civilians as targets, and its codex note names the
  civilian cost. All art and layouts are original; no map is traced from a
  book scan, a period plan or another game.
- **MVP**: map catalog and picker; heightfield and terrain sight blocking;
  water with ford, bridge and ferry; corn, cane and tall-grass concealment;
  the three maps with placeholder kits where models are missing; per-map
  deployment for the 3v3; locales; goldens and the bench.
- **Non-goals**: entering buildings or firing from windows; destructible
  buildings and crops; burning fields; swimming; cavalry and artillery;
  civilians; weather and night; procedural maps; a map editor; campaign
  missions on these maps.
