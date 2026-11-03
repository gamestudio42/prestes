## Why

The repository only has OpenSpec scaffolding and GameStudio42 standards. Before any
historical content, the project needs a foundation that makes the game's hard rules
cheap to keep: deterministic simulation, a strict simulation/presentation boundary,
low-poly 3D rendering, PT-BR/EN localization, and sourced historical figures. Without
this foundation, later chapters would either bake those rules into ad hoc code or
contradict the history.

This change establishes the foundation for the **Prestes** vertical slice: the
Prologue ("Os 18 do Forte") and the first column mission ("O Anel de Ferro"). It does
not implement either mission yet.

## What Changes

- Create the pnpm monorepo skeleton: `apps/game`, `packages/kernel`,
  `packages/shared`, `packages/simulation`, `packages/view3d`, `packages/content`,
  `tools`, `tests`, `docs`.
- Add a deterministic simulation kernel: fixed 100 ms tick, seeded RNG, FNV-1a state
  hash, command/event protocol and a headless runner.
- Add a Web Worker simulation host and a read-only client mirror for the main thread.
- Add a Three.js graybox scene with the Vazante-style camera bands (strategic,
  tactical) and a low-resolution internal render target.
- Add a React shell and HUD placeholder that only reads the client mirror.
- Add the localization scaffold: English source strings, PT-BR and EN locale files,
  a language switch, and a missing-key check.
- Add the historical figure registry and research documents: figure IDs, roles,
  playability, source references and content labels (historical/dramatized/fictional).
- Add build, lint, typecheck, unit-test, E2E smoke-test and GitHub Pages workflows.
- Add project documentation: README, architecture note, history sources/timeline,
  asset register placeholder and decision log.
- **Non-goals:** playable missions, combat, squad AI, campaign progression, final art,
  audio production, direct control, Electron, multiplayer and additional languages.

## Capabilities

### New Capabilities

- `simulation`: deterministic tick, seeded RNG, state hashing, command/event boundary
  and headless execution.
- `presentation`: boot flow, low-poly graybox scene, camera bands, low-resolution
  render target and a read-only React HUD shell.
- `localization`: English source strings plus PT-BR and EN locales, language switch
  and missing-key validation.
- `historical-content`: historical figure registry, source citations, content labels
  and the playable-figure contract for missions.
- `delivery`: check/build scripts, CI validation and GitHub Pages publishing.

### Modified Capabilities

None. This is the first capability set in the repository.

## Impact

- New workspace packages and `apps/game`; no existing application code to migrate.
- New `pnpm` scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `check`, `e2e`.
- New Node 22 and pnpm 10 requirements; Vite, React, Three.js, Vitest, Playwright,
  ESLint and Prettier dependencies.
- New Web Worker boundary and deterministic kernel that later missions must use.
- New `docs/history/` sources and figure registry consumed by the campaign changes.
- New GitHub Pages workflow publishing `apps/game/dist`.

### Legal and ethical note

The game is an original work **inspired by** Jorge Amado's "O Cavaleiro da Esperança"
and by historiography; no book text is reproduced. The books remain copyrighted, so a
direct adaptation would require permission from the rights holders. Historical claims
must be traceable to `docs/history/SOURCES.md`; content is labeled historical,
dramatized or fictional. The game presents multiple perspectives and does not
hero-worship its figures.

Macaulay's *The Prestes Column* (1974) is the chronology baseline; Amado supplies tone
and arc; Blanc's *An Interior History of Modern Brazil* (2024) supplies social and
interior history. `docs/history/SOURCE_POLICY.md` records the tier hierarchy and
conflict rule. DRM is never bypassed. Book scans and extracted text stay under
`livros/`, are gitignored and are never redistributed; only paraphrased notes and page
citations enter the repository.

### Multi-perspective contract

The campaign uses the historical figure who was actually present as the mission
commander. The Prologue will be commanded by Siqueira Campos; "O Anel de Ferro" by
Luis Carlos Prestes. This change provides the registry and validation that later
missions require; it does not create missions.
