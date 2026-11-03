## Context

See `proposal.md` for motivation. The repository currently contains only the
OpenSpec scaffold and the GameStudio42 standards installed under `.gs42/standards/`.
There is no application code, package manifest or CI. This design fixes the
foundation that later campaign changes must reuse.

Constraints that shape the approach:

- Solo development: the smallest reusable architecture wins over a large framework.
- Browser first with GitHub Pages; Electron is post-MVP.
- The simulation must stay deterministic and independent from rendering.
- PT-BR and EN must be first-class from the first build.
- Historical content must be traceable and labeled.

## Goals / Non-Goals

**Goals:**

- A pnpm workspace with explicit package boundaries and no circular dependencies.
- A deterministic kernel and a headless runner that can prove reproducibility.
- A worker-hosted simulation with a read-only presentation mirror.
- A low-poly graybox scene and camera bands that later missions reuse.
- A localization pipeline with an English source catalog and PT-BR/EN locales.
- A historical figure registry with sources, labels and a mission-commander contract.
- One check command, a static build and CI/Pages delivery.

**Non-Goals:**

- Mission content, combat, squad AI, campaign progression and final art.
- A seamless strategic/tactical world; the graybox proves the camera pipeline only.
- Direct control, Electron, multiplayer, voice acting and additional languages.
- Final balance, historical review sign-off and store distribution.

## Decisions

### 1. Workspace layout and dependency direction

```text
apps/game          Vite entry, React shell, worker host, i18n, storage
apps/desktop       reserved; not implemented in this change
packages/kernel    RNG, hash, fixed-step helpers; no game rules
packages/shared    types, commands, events, worker protocol, constants
packages/simulation  authoritative state and future systems; no DOM/view imports
packages/view3d    Three.js scene, low-res pipeline, camera rigs, picking
packages/content   figures, locales, future missions/campaign data
tools              headless runner, model preparation, benchmarks
tests              cross-package and browser tests
docs               architecture, history, narrative, assets, decisions
```

Dependency direction: `kernel -> shared -> simulation`; `shared -> view3d`;
`apps/game` composes all. `simulation` never imports `view3d`, React, DOM or Node
APIs. This mirrors the proven separation in the studio's reference games while
keeping the package count small enough for one developer.

Alternative considered: a single `src/` app with folders. Rejected because the
determinism rule is easier to enforce and test when the simulation is a separate
package with its own lint boundary.

### 2. Deterministic kernel

- Fixed tick: `TICK_DT = 0.1` seconds (10 Hz).
- Seeded RNG: xoshiro128** with explicit state; one engine-owned stream.
- State hash: FNV-1a over authoritative state and RNG state.
- `Math.random`, `Date`, `performance` and transcendental functions are forbidden
  inside `packages/kernel` and `packages/simulation`, enforced by ESLint.
- Iteration is by index or insertion order; no hash-order iteration of floats or
  object-keyed maps.
- The headless runner applies a command script and prints the final hash.

Alternative considered: use the browser clock and interpolate. Rejected because
replays, save/load and tests require an exact tick.

### 3. Worker boundary

The worker owns the simulation. The main thread sends command envelopes and
receives frame messages plus the events of that tick. Frames are typed arrays or
plain serializable snapshots; the client keeps a read-only mirror. The renderer
interpolates between the last two frames. The UI never holds a mutable simulation
handle.

Alternative considered: run the simulation on the main thread. Rejected for the
foundation because the worker boundary is the rule later systems must respect; a
main-thread fallback can be added only if browser support requires it.

### 4. Presentation pipeline

- Three.js scene with flat-shaded low-poly geometry and a limited palette.
- Internal render target below display resolution, nearest-neighbour upscale.
- Two camera bands: strategic (top-down, high) and tactical (angled, lower), with
  continuous height blending and pan/rotate/zoom.
- React HUD rendered at native resolution, outside the low-res canvas.
- Graybox placeholders: terrain patch, one building block, unit markers, camera
  band indicator, tick counter.

The art pass (toon lighting, outline, palette quantization) is deferred. The
graybox must already use the final camera bands and render target so the art pass
does not force a rewrite.

Alternative considered: start with final art. Rejected for a solo project; the
pipeline and camera are the risky parts, not the first mesh.

### 5. Low-poly content pipeline

- Models authored in Blender, exported as GLB, optimized with glTF-Transform.
- Flat shading, vertex colours or a tiny shared palette; no large textures.
- Modular kits: terrain tiles, building shells, props, soldier variants.
- Instancing for repeated props and later units; LODs only when a mission needs them.
- Every asset is registered in `docs/assets.md` with source and licence.
- Placeholders are named `placeholder` or `TODO` and are never described as final.

This change only creates the pipeline and placeholder assets; final models belong
to the mission changes.

### 6. Localization

- English is the source catalog; PT-BR and EN are the shipped locales.
- Keys are typed; player-facing components receive keys, not literals.
- The language switch persists in local storage and defaults from the browser
  language when it is PT-BR or EN.
- A check compares key sets across the source and both locales and fails on
  missing or extra keys.

Alternative considered: translate later. Rejected because retrofitting keys into
narrative-heavy content is expensive and error-prone.

### 7. Historical content schema

- `packages/content/src/figures.ts` exports a registry of historical figures:
  `id`, `displayName`, `role`, `playable`, `labels`, `sourceRefs`.
- `docs/history/SOURCES.md` lists source keys and citations; `TIMELINE.md` records
  the campaign chronology and the known corrections.
- `docs/history/SOURCE_POLICY.md` records the tier hierarchy: Macaulay as Tier 0
  for chronology, Amado as Tier 1 for tone, Blanc as Tier 1 for social and
  interior history, regional studies as Tier 3, and the MVCP portal as a Tier 4
  finding aid. Conflicts are logged rather than silently resolved.
- A validation function checks that source references resolve and that a mission
  commander exists and is playable.
- Narrative and codex entries carry one label: `historical`, `dramatized` or
  `fictional`.
- The registry starts with Siqueira Campos and Luis Carlos Prestes; later changes
  add the rest of the roster.
- Book scans and OCR text are research inputs, not repository content: they live
  under `livros/`, which is gitignored. The local pipeline extracts text and
  renders reference maps (`livros/macaulay/text/`, `livros/macaulay/maps/`) and
  never bypasses DRM. Only paraphrased notes with page citations enter `docs/`.

Alternative considered: embed figure data in mission files. Rejected because the
same figure recurs across chapters and the codex needs one source of truth.

### 8. Build, test and delivery

- pnpm 10 workspace; Node 22; TypeScript strict.
- Vite builds `apps/game/dist` with a relative base so Pages can serve a subpath.
- `pnpm check` = typecheck + lint + unit tests + localization/content validation.
- Playwright smoke test boots the build, reaches the start screen and switches
  language.
- GitHub Actions: check on every push/PR; upload and deploy on main.
- `pnpm e2e` runs locally and in CI when browser installation is available.

### 9. Licence and asset policy

Code is AGPL-3.0-or-later. Original art, text and documentation are original
works; third-party assets keep their own licences and are recorded in the asset
register. No code, art or text is copied from Vazante or other games. The book is
used as inspiration only; no verbatim text is stored in the repository.

## Risks / Trade-offs

- **Monorepo overhead for a solo developer** → keep packages small, no per-package
  build step, and expose `src/index.ts` directly.
- **Worker boundary slows early iteration** → provide a headless runner and a
  debug frame log so most logic can be tested without the browser.
- **Low-resolution rendering can hurt readability** → keep the HUD and text at
  native resolution and add a debug toggle for the internal scale.
- **Scope creep into mission content** → this change stops at graybox, kernel,
  i18n and figure registry; combat and missions are separate changes.
- **Historical accuracy drift** → source keys are mandatory, labels are validated,
  and the timeline records the known corrections.
- **Localization drift** → key-set validation runs in `pnpm check`.
- **GitHub Pages base-path bugs** → relative base plus a smoke test served from a
  nested path.
- **GS42 standards detection** → the first run sees no `package.json` and selects
  `core`; after the skeleton exists, re-run `gs42-standards init --detect` to add
  the `web-game` profile, then re-check.

## Migration Plan

Greenfield: no data or users to migrate. Land the foundation behind the existing
OpenSpec/GS42 scaffold, verify `pnpm check` and the browser smoke test, then publish
the first Pages preview. Rollback is a revert of the change; no production state
exists.

## Open Questions

None blocking this change. Final palette, unit roster, campaign-map design and
Electron packaging are intentionally deferred to later changes.
