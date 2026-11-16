## Context

See `proposal.md` (Why) and the specs. What exists today (2026-11-16):

- **Build.** `vite.config.ts` uses `base: './'` (served from a subpath),
  two pages (`index.html`, `editor.html`), and vendor chunks for three.js,
  React and the glTF loaders. Campaign maps are on-demand chunks.
- **Build size.** About 46 MB in all:
  - models 13 MB;
  - audio 9.8 MB;
  - music 9 MB;
  - video 6.5 MB;
  - hashed assets 7.6 MB;
  - JS, CSS and fonts 4.3 MB.
- **Model loading.**
  - `ModelLibrary.include(files)` in `packages/view3d/src/environment-models.ts`
    loads each GLB once, caches the promise, and forgets a failed file so it
    can be asked for again.
  - `loadEnvironmentAsset` loads the base files and the environment atlas.
  - The character layer loads `soldier.glb`, and `PaintedGround` loads
    `models/textures/ground-atlas.png`.
  - `SceneView` starts all of these when it is built and draws placeholders
    until they arrive.
- **Public URLs.** Model, texture, audio, music and video URLs are relative
  strings (`'./models/'`, `sound-files.ts`, `gramophone-tracks`).
- **Pages.** `.github/workflows/pages.yml` runs `pnpm check` and
  `pnpm build` on every push, and deploys `apps/game/dist` from `main`.
- **Pending images.** `art-src/compendium-pending/` is gitignored and
  `vite-pending-images.ts` serves it in dev only. The review build goes to
  `dist-review`. Licences live in the compendium image register
  (`permission-pending`, `permission-granted`).

**Figures and history.** Unchanged (see the proposal). No research is
needed: the loading screen quotes existing briefing text.

## Goals / Non-Goals

**Goals:**
- The simulation boundary is untouched. Loading is presentation only, and
  the worker receives the same start request.
- One place lists what a battle needs, so the loading screen, the preload
  and the tests agree.
- The release check runs locally, like every gate (`tools/verify.ts`).

**Non-Goals:** see the proposal. Design-level additions:
- No progress in bytes. Content-Length is not reliable across Pages and
  compressed responses, so progress is counted in files.
- No preloading of the next chapter during a battle.

## Decisions

**D1. The splash lives in `index.html`, styled inline, with a tiny inline
script.**

- **Markup and style.** The markup and a `<style>` block are inline. They
  use the desk's palette and the system serif, and need no webfont: the
  fonts are part of what is still downloading.
- **The inline script.** About 1 KB, no import. It does three things:
  1. it picks the language from `localStorage['prestes.locale']`, then from
     `navigator.language`;
  2. it fills the splash's text from a two-entry table;
  3. it runs the capability check (D4).
- **Hiding the splash.** `main.tsx` imports nothing new. The desk calls
  `window.__prestesReady?.()` once it is mounted and its art has decoded,
  which adds a `hidden` class (CSS fade, then `display: none`).
- **Locale strings.** The splash strings are duplicated in the inline table
  and the locale files. A unit test reads `index.html` and checks that the
  inline table matches `splash.*` in both locales, so the two copies cannot
  drift.
- *Alternative:* a React splash. Rejected: React is part of the 1.7 MB the
  splash covers.

**D2. `battleAssets(map)` lists what a battle needs; `preloadBattle`
loads it with progress.**

- **The list.** A pure function in view3d,
  `battleAssets(map: BattleMap): AssetList`, returns the following, in a
  stable order:
  - the soldier file;
  - the environment atlas;
  - the base environment files (`FILES`);
  - the biome tree and stone files that the map's objects name, the same
    rule `SceneView` uses today;
  - the ground atlas when `map.paint` exists.
- **The loading.** `preloadBattle(list, onProgress)` loads each entry
  through the same caches the scene uses: the shared `ModelLibrary`, the
  soldier asset promise and the texture cache. A battle therefore never
  fetches a file twice. Progress is `{ done, total, failed }`.
- **The scene.** `SceneView` takes the preloaded assets. Its placeholder
  path stays for a failed file.
- **The map document.** It is fetched first (`loadAuthoredMap`). It counts
  as one entry, because the asset list depends on it.
- *Alternative:* wrap Three's `LoadingManager` globally. Rejected: it also
  counts loads unrelated to the battle (thumbnails, the desk), so the
  numbers would not match the list.

**D3. The app holds the battle start until the preload ends; the screen
shows after 300 ms.**

- **Holding the start.** `startBattle` already fetches an unloaded map
  before it creates the client. It now awaits `preloadBattle` as well, and
  only then creates the client and the scene.
- **The screen.** `BattleLoading` is a full-screen panel in the book's
  style, mounted when the wait passes 300 ms. It shows:
  - the name (the chapter's number, title and commander from the campaign
    registry, or the map's name);
  - a bar and "n / total";
  - one line: the first sentence of the briefing pitch, or the map's
    `setting` text.
- **A file that fails.** It is retried once, inside the preload. A second
  failure is counted in `failed`. The battle then starts, and the HUD shows
  a dismissible notice.
- **A start that is overtaken.** Leaving to the menu, or starting another
  battle while loading, cancels the wait through a generation counter. The
  late result is dropped.
- **Determinism.** Seeds and commands never depend on load time. The client
  is created after loading, with the same arguments.

**D4. The capability check runs in the inline script.**

- **The check.** It tests `document.createElement('canvas').getContext('webgl2')`.
  For module workers, it builds a `Worker` from a `data:` URL with
  `{ type: 'module' }` inside try/catch, or reads `'type' in
  Worker.prototype` where that is not allowed.
- **On failure.** It writes the message into the splash and sets
  `window.__prestesUnsupported = true`. `main.tsx` checks the flag and does
  not mount the app.
- **WebGL 1 only.** A browser with only WebGL 1 counts as unsupported: the
  renderer needs WebGL 2.

**D5. The build id comes from Vite's `define`; one helper builds public
URLs.**

- **The id.** `vite.config.ts` sets `__BUILD_ID__` to the short commit
  hash, or, outside git, a hash of the build time. In dev it is `'dev'`.
- **The helper.** `publicUrl(path)` lives in `packages/shared`, typed
  through a declared global. It returns `path + '?v=' + __BUILD_ID__`.
- **Who uses it.**
  - `./models/`, the textures, `sound-files.ts`, the gramophone tracks,
    the menu video and the map previews all go through it;
  - view3d takes a base URL already, so the app passes versioned bases;
  - files under `assets/` that Vite hashes are left as they are.
- **The guard.** A lint-like unit test searches the source for the
  literals `'./models/'`, `'./audio/'`, `'./music/'` and `'./video/'`
  outside the helper, and fails when one appears.

**D6. `tools/check-release.ts` reads the build and the registers.**

- **Forbidden files.**
  - Every built file whose name matches the file of an image registered as
    `permission-pending` (read from `packages/content`).
  - Any path containing `compendium-pending` or `dist-review`.
  - Any `*.map` file.
  - Any built JS containing the edit link's marker strings (the
    `EDIT_MAP_LABEL` texts).
- **First-visit bytes.** They are the sum of:
  - `index.html`;
  - the entry chunk and its static imports, read from Vite's manifest
    (`build.manifest: true`);
  - the CSS;
  - the fonts referenced by that CSS;
  - the desk's art files listed in `DESK_ART`.
- **Budget.** `tools/release-budget.json`, for example 3.5 MB for the
  first visit and 60 MB in total. The first measured values go into
  `docs/status.md`.
- **Gate.** The check is added to `tools/verify.ts` after the build.

**D7. The slow-network e2e uses Chromium's network emulation on the built
game.**

- **Emulation.** `tests/e2e/slow-network.spec.ts` opens a CDP session and
  calls `Network.emulateNetworkConditions`: about 1.5 MB/s down, 150 ms
  latency, cache disabled.
- **Server.** It runs against the `vite preview` server of the build
  (Playwright's `webServer` for a second project), not the dev server, so
  chunking and `?v=` are as published.
- **What it checks.** It records the order of the splash, the desk, the
  loading screen and the HUD, and progress values from the screen's
  `data-done` and `data-total`, and it collects console errors.
- **Speed.** It is tagged slow and runs in `pnpm e2e`, about one minute.

**D8. The release path is a document and owner-gated tasks.**

- **The document.** `docs/RELEASE.md` (PT-BR) states the steps of the
  spec, with the exact commands.
- **Bringing `main` up.** The recommended way is a fast-forward of `main`
  to the working branch. `main` has no commits of its own, which the doc
  checks with `git log working..main`.
- **The push.** It is to the GameStudio42 repository.
- **Pages.** The repository's Pages source is set to "GitHub Actions".
  The existing `pages.yml` deploys.
- **The gate.** Each of these steps is a task marked "only on the owner's
  word". Claude asks before running it, every time.

## Risks / Trade-offs

- **[Risk] The 300 ms delay hides a slow load of 299 ms behind a frozen
  screen.**
  → Mitigation: the menu stays drawn, with the clicked button marked
  "loading" until the screen or the battle shows.
- **[Risk] The battle waits for every model, even ones far off-screen.**
  The longest wait on a cold cache could be several seconds for the town
  maps (`buildings-town.glb` is 4.3 MB).
  → Accepted for this change. The slow-network e2e records the time, and
  compressing GLBs is the named follow-up if it is too long.
- **[Risk] `?v=` busts the browser cache on every release, even for
  unchanged files.**
  → Accepted. Releases are rare and the files are small. Content hashes
  for public files are a later refinement.
- **[Risk] GitHub Pages limits.** About 1 GB per site and soft bandwidth
  limits. The build is about 46 MB.
  → Fine. `check:release` budgets the total size.
- **[Trade-off] The splash strings live in two places** (D1).
  → The unit test keeps them equal.

## Migration Plan

- **Rollout.** The work is local first, through the full `pnpm verify`.
  Then the owner-gated release steps follow (D8).
- **Rollback.** Revert the change's commits. For the published site, push
  the previous release commit to `main`, and Pages redeploys it.

## Open Questions

- The exact GameStudio42 repository name and whether the site gets a custom
  domain. Both are needed only at the release tasks and do not change the
  specs or the work before them.
