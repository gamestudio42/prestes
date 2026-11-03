# Prestes

A historical tactical RTS about Luís Carlos Prestes and the Coluna Prestes
(1922–1927), for the browser, in 3D low-poly. The campaign is multi-perspective:
Prestes is the narrative spine, but each mission is commanded by the historical
figure who was actually present.

> **Status:** first playable bootcamp. The repository contains the deterministic
> simulation, a Vazante-inspired orthographic camera and pixel post, original
> low-poly 1920s character proxies, a three-phase training exercise with
> non-lethal opposing fire, section selection, a bottom orders panel, rifle
> combat with cover, ammunition and morale, pause/speed, PT-BR/EN localization
> and the historical source policy. Campaign and save/load are not implemented yet.

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
  spacing, formations, tactical orders, fatigue, casualty rescue, recovery and
  worker host.
- `packages/view3d`: orthographic camera rig, pixel post, toon materials, low-poly
  terrain heightfield, character rig, movement paths and shot tracers.
- `packages/content`: figure registry, source keys, PT-BR/EN catalogs, validation.
- `apps/game`: Vite + React shell, bottom orders panel, formation selector,
  section cards, codex, the three-phase bootcamp objective panel, opt-in order
  previews, a hideable HUD, F1 sandbox lab (whole troop insertion, cover,
  placement previews with Z/X rotation, both-sides control, reinforcements and
  casualty drills), language switch, pause/speed/step controls, selection and
  right-click orders.

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
- [`docs/history/CHAPTER_SOURCES.md`](docs/history/CHAPTER_SOURCES.md)
- [`docs/history/MACAULAY_NOTES.md`](docs/history/MACAULAY_NOTES.md)

Book scans, OCR text and extracted maps live under `livros/`, which is gitignored
and never redistributed.

## Licence

Code: GNU Affero General Public License, version 3 or later
(`AGPL-3.0-or-later`). See [`LICENSE`](LICENSE). Original art is released under
CC-BY-4.0; fonts keep SIL OFL and Lucide keeps ISC. See
[`docs/assets.md`](docs/assets.md).






