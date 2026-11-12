# Prestes

A historical tactical RTS about Luís Carlos Prestes and the Coluna Prestes
(1922–1927), for the browser, in 3D low-poly. The campaign is multi-perspective:
Prestes is the narrative spine, but each mission is commanded by the historical
figure who was actually present.

> **Status:** playable skirmish. A battle on an authored map opens in a
> deployment phase and is fought for capture-and-hold objectives against an
> enemy commander under fog of war. The repository contains the deterministic
> simulation, a Vazante-inspired orthographic camera and pixel post, original
> low-poly 1920s character proxies, rostered sections with period weapons,
> cover slots, garrisons and close assault, a map editor, a desk menu with the
> campaign book and the compendium, PT-BR/EN localization and the historical
> source policy. The campaign's chapters are written but not playable, and
> save/load is not implemented. See [`docs/status.md`](docs/status.md).

## Requirements

- Node.js 22 or newer
- pnpm 10

## Commands

```bash
pnpm install
pnpm dev        # Vite dev server
pnpm build      # static build in apps/game/dist
pnpm check      # typecheck + lint + tests + locale/content checks
pnpm verify     # local gate: check, build, bundle budget, determinism, OpenSpec, e2e
pnpm verify:quick             # the same gate without the Playwright suite
pnpm check:determinism        # fixed seeded scenario must match tools/determinism-golden.json
pnpm check:determinism --update  # record a new golden after an intended simulation change
pnpm check:bundle             # built JS/CSS sizes against tools/bundle-budget.json
pnpm check:maps               # authored maps: deployment areas, objectives, cover
pnpm battle:report            # headless 3v3 report (time, losses, fire by weapon)
pnpm coverage                 # unit-test coverage report in coverage/ (line threshold 90%)
pnpm e2e        # Playwright browser suite
pnpm sim        # headless deterministic run
pnpm bench      # six- and twelve-unit tick benchmark
pnpm models     # export character source models to GLB
```

## What exists

- `packages/kernel`: seeded RNG, FNV-1a hash, fixed-step helpers.
- `packages/shared`: commands, events, frames, squads, factions, order paths,
  weapon profiles, cover/line-of-sight helpers, pathfinding and the client mirror.
- `packages/simulation`: deterministic engine with combat, per-unit magazine and
  reserve, weapon-driven fire, directional cover, morale/suppression states,
  panic/rout, facing, tactical target scoring, flanking, auto-cover, section
  spacing, formations, tactical orders, fatigue, casualty rescue, recovery,
  side vision (fog of war), the deployment phase, objectives, garrisons and
  close assault, the crew-served machine gun, the enemy commander and the
  worker host.
- `packages/view3d`: orthographic camera rig, pixel post, toon materials, low-poly
  terrain heightfield, character rig, movement paths and shot tracers.
- `packages/content`: figure registry, source keys, the compendium and the
  campaign chapters, PT-BR/EN catalogs, validation.
- `apps/game`: Vite + React shell; the desk menu (campaign book, the
  compendium "A Coluna Prestes", reference pile, gramophone, options compass,
  map sheets, roster builder); the battle HUD (orders board, formation
  selector, section cards, deployment banner, objectives, opt-in order
  previews, queued orders, pause/speed); and the map editor
  (`editor.html`), where every battle map and test situation is authored.

## Design references

- [`docs/design/INFANTRY_COMMAND.md`](docs/design/INFANTRY_COMMAND.md) —
  movement, orders, concurrency, casualties and recovery specification.
- [`docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md`](docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md)
  — phased implementation plan, test matrix and metrics ledger.

## Placeholders

The scene is a **visual prototype**. Terrain, walls, barrels, low walls, trees, sandbags,
character proxies and section portraits are original low-poly or CSS placeholders;
the HUD and codex are placeholders too. Character meshes and animations are still
being authored. See [`docs/assets.md`](docs/assets.md).

## History and sources

The game is an original work inspired by Jorge Amado's *O Cavaleiro da Esperança*
and by historiography. It does not reproduce book text. Macaulay's *The Prestes
Column* (1974) is the chronology baseline; Amado supplies tone; Blanc (2024)
supplies social and interior history. See:

- [`docs/history/SOURCE_POLICY.md`](docs/history/SOURCE_POLICY.md)
- [`docs/history/SOURCES.md`](docs/history/SOURCES.md)
- [`docs/history/TIMELINE.md`](docs/history/TIMELINE.md)
- [`docs/history/FIGURES.md`](docs/history/FIGURES.md)
- [`docs/history/WEAPONS.md`](docs/history/WEAPONS.md)
- [`docs/history/FORCES.md`](docs/history/FORCES.md)
- [`docs/history/CHAPTER_SOURCES.md`](docs/history/CHAPTER_SOURCES.md)
- [`docs/history/MACAULAY_NOTES.md`](docs/history/MACAULAY_NOTES.md)

Book scans, OCR text and extracted maps live under `livros/`, which is gitignored
and never redistributed.

## Licence

Code: GNU Affero General Public License, version 3 or later
(`AGPL-3.0-or-later`). See [`LICENSE`](LICENSE). Original art is released under
CC-BY-4.0; fonts keep SIL OFL and Lucide keeps ISC. See
[`docs/assets.md`](docs/assets.md).






