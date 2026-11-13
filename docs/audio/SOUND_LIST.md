# Battle sounds: the list and their sources

ambient-sound-and-voices 3.1 (2026-11-13). Every ambient, water and
footstep sound the battle will play, with a proposed source for each, for
the owner to approve or change. The voice lines are not here: they are the
catalog and recording script of tasks 5.1 and 5.2.

Sources, as the design allows (D10):

- **Owner**: recorded by the owner (WAV, any phone or recorder), prepared
  with `pnpm prepare:audio`.
- **Synth**: made in code or with ffmpeg from noise and tones, no
  recording; reads well for wind and running water.
- **CC0**: a public-domain field recording, chosen at task 3.2 from a CC0
  library (Freesound with the CC0 filter), its author, page and licence
  entered in `docs/assets.md` before it ships. No recording is named yet:
  each is picked by ear when the sound is built, and the owner hears it in
  the review.

Everything must belong to the 1920s interior: no engines, no electric hum,
no radio, no birds or animals foreign to the biome.

Format and level by group follow `tools/prepare-audio.ts`: mono MP3, beds
and water 32 kHz 64 kbps looped with a 2 s cross-fade, footsteps looped
with 0.5 s, one-shots trimmed.

## Ambient beds (loops of 30 to 60 s)

The bed is chosen by the ground around the listening point and by the
map's hour (design D3). Proposed as two layers, so five places and four
hours need nine loops rather than twenty: an **air bed per place**, and an
**hour layer** over it.

| Id | What it sounds like | Source |
| -- | -- | -- |
| `bed-cerrado` | Open cerrado: dry wind in the grass and the twisted trees, wide and thin | Synth wind under a CC0 cerrado field recording |
| `bed-forest-edge` | Forest edge: leaves moving, a closer, fuller air | CC0 |
| `bed-caatinga` | Caatinga: hot, sparse, a dry rattle of thorn scrub in the wind | Synth wind with a CC0 dry-scrub texture |
| `bed-pasture` | Pasture: open wind, a far fence wire humming, grass | Synth wind, CC0 grass |
| `bed-town` | Small interior town: a far murmur, a door, a hen, no traffic | CC0 village ambience with no engines, or Owner |
| `hour-dawn` | Dawn chorus of the interior, rising | CC0 |
| `hour-day` | Midday cicadas and insects, heat | CC0, or Synth cicada |
| `hour-dusk` | Dusk: fewer birds, the first crickets | CC0 |
| `hour-night` | Night: crickets, frogs, an owl | CC0 (see the note below) |

Hours by the map's time (06:00 to 18:00): dawn 06:00 to 08:00, day 08:00
to 16:30, dusk 16:30 to 18:00. **Note:** a map's light runs from 6 to 18
today (`MAP_LIGHT_TIME`), so no map is at night. `hour-night` is listed
for when maps can be set at night; it is not needed for the first set.

## One-shots (occasional, never the same twice in a row)

| Id | What | Fits | Source |
| -- | -- | -- | -- |
| `bird-seriema` | Seriema calling, far | Cerrado, pasture; dawn, day | CC0 |
| `bird-bem-te-vi` | Bem-te-vi | All places; day | CC0 |
| `bird-anu` | Anus in a flock | Pasture, cerrado; day | CC0 |
| `bird-maritaca` | Parakeets passing over | Forest edge, town; dawn, dusk | CC0 |
| `bird-inhambu` | Tinamou whistle | Forest edge, cerrado; dusk | CC0 |
| `bird-gaviao` | Hawk's cry overhead | All; day | CC0 |
| `bird-urutau` | Potoo's lament | Forest edge; night only | CC0 |
| `dog-far` | A dog barking far off | Town, pasture | Owner or CC0 |
| `rooster` | A rooster | Town, pasture; dawn | Owner or CC0 |
| `cattle` | Cattle lowing far | Pasture | CC0 |
| `horse` | A horse snorting and stamping | All; near the camp | Owner or CC0 |
| `ox-cart` | An ox-cart's axle singing far off (carro de boi) | Pasture, town | CC0 |
| `church-bell` | One distant church bell | Town | CC0 |
| `gust` | A gust through the trees | All | Synth |
| `branch` | A dry branch cracking | Forest edge, caatinga | Owner or CC0 |

## Water (loops, positioned at the nearest stretch, design D5)

| Id | What | Source |
| -- | -- | -- |
| `water-river` | A wide river: a deep, slow wash | Synth (low-passed noise, slow swell), CC0 if it reads thin |
| `water-stream` | A narrow stream: brighter, faster trickle | Synth, CC0 if it reads thin |
| `water-ford` | Shallow water over stones, broken and bright | CC0 |
| `water-pond` | Still water: a faint lap, frogs | CC0 |
| `wading` | Men wading, legs pushing through water (loop by group) | Owner (a bucket or a tank and boots) or CC0 |

## Footsteps (loops by group, design D4)

Per surface, three loops: one man walking, a section walking, a section
running. Crawling has two loops for every ground: dry and wet. Equipment
rattle plays over running. The number of men moving picks the loop (one,
or the section), and a few men play the section loop thinner.

| Surface | Map grounds it covers | Source |
| -- | -- | -- |
| `road` | `road`, `dirt-road`, packed earth, red earth | Owner (boots on a dirt track) |
| `dirt` | `grass` worn, `sand`, field soil, cerrado and caatinga soil | Owner |
| `grass` | `grass`, `pasture`, `tall-grass`, cerrado grass | Owner |
| `mud` | `mud` | Owner (a garden after rain) or CC0 |
| `stone` | `cobbles`, `stone`, `gravel`, `lajedo`, pebbles | Owner |
| `wood` | bridges, landing stages | Owner (a wooden deck or floor) |
| `water` | fords, shallow water | shared with `wading` |
| `brush` | `crop`, `scrub`, leaf litter (cane, scrub, dry leaves) | Owner (walking through tall dry plants) or CC0 |
| `crawl-dry`, `crawl-wet` | every ground | Owner |
| `rattle` | over a running section | Owner (a canteen, a belt and a rifle sling shaken) |

Footsteps are best recorded by the owner: they are many short loops, they
must sound like boots of the period (leather soles, hobnails on stone),
and a CC0 set rarely matches across surfaces.

## Sizes (estimate, for the budget of 6.2)

| Group | Count | Size |
| -- | -- | -- |
| Beds and hour layers | 9 loops of about 40 s | about 2.9 MB |
| One-shots | 15 of about 3 s | about 0.4 MB |
| Water | 5 loops of about 30 s | about 1.2 MB |
| Footsteps | 8 × 3 + 3 loops of about 8 s | about 1.7 MB |
| **Total** | | **about 6 MB** |

Loaded per battle, only what its map needs (design D9): a map without
water or a town loads none of those.
