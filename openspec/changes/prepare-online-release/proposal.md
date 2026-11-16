## Why

The owner wants Prestes online, published from GameStudio42's git
(2026-11-16). The game was built and tested on a local dev server, where
every file arrives at once. Online, four things break or look broken.

- **The first open is a blank page.** About 1.7 MB of JavaScript (the main
  chunk 698 KB, three.js 596 KB, React 222 KB) plus fonts and the desk's art
  download before anything shows, and `index.html` has nothing but an empty
  `#root`.
- **A battle starts before its world has arrived.** The battle starts at
  once. The 3D models then arrive one by one and pop into place over the
  placeholders, while the deployment phase is already on screen. The models
  are 13 MB of GLB in all (`buildings-town.glb` alone is 4.3 MB), plus the
  ground atlas, and the map chunk is about 330 KB.
- **Stale files after a release.** The models, audio, music and video
  (about 38 MB under `public/`) keep fixed names. After a release, a browser
  can mix new code with old models.
- **No release gate.** Nothing checks that images still under a permission
  request (`art-src/compendium-pending/`, the review build) stay out of
  the published build. Nothing measures what a first visit downloads.
  There is no written path from the working branch to GitHub Pages: `main`
  is more than 200 commits behind, and no remote exists.

## What Changes

**Player fantasy and core loop.** Unchanged. The player opens a link and
reaches the camp desk, opens the campaign book, plays a chapter or a
skirmish. What changes is that every wait is visible, short where it can
be, and never a blank or half-built screen.

- **An opening screen from the first byte.**
  - `index.html` carries a small inline splash: the title, a period line,
    and a progress line in the visitor's language (the stored locale, or
    the browser's), drawn without JavaScript chunks.
  - The splash stays until the desk is ready, then fades.
  - A browser that cannot run the game (no WebGL 2, or no module workers)
    sees a plain bilingual message on the splash in place of a blank page.
- **A loading screen before every battle.**
  - Skirmish, campaign chapter and editor playtest all wait on this screen
    for the battle's map and the models it uses: the soldier, the
    environment files, the biome trees and stones the map places, and the
    ground atlas.
  - It shows the map's or chapter's name, real progress (files done of
    files needed), and a line from the chapter's briefing, or the map's
    setting for a skirmish.
  - On a warm cache the battle starts with no screen at all: the screen
    shows only when loading takes longer than a short delay.
  - A file that fails is retried once. After that the battle starts anyway
    with the existing placeholders and a notice: a missing file never
    blocks play.
- **Fresh files after a release.** Every file under `public/` is requested
  with the build's id (`?v=<build id>`), so a new release never mixes with
  cached models, audio or music. Hashed chunks already behave this way.
- **A release readiness check, `pnpm check:release`, part of `pnpm verify`.**
  It fails when the published build holds any of the following:
  - an image whose licence is `permission-pending`;
  - a file from `art-src/compendium-pending/` or the review build;
  - a source map, or a development-only page or link.

  It also reports and budgets what a first visit downloads, and the total
  size of the build.
- **A slow-network end-to-end test.** It opens the game and starts a
  battle under throttled bandwidth and latency. It checks the splash, the
  desk, the battle loading screen with rising progress, and a battle that
  starts with no console errors.
- **A written release path** (`docs/RELEASE.md`, PT-BR). It covers:
  - the GameStudio42 repository the owner names;
  - adding the remote;
  - bringing `main` up to the working branch;
  - the first push;
  - turning on Pages in the repository's settings;
  - the checks after deploy.

  Claude does not add a remote, push or deploy without the owner's word for
  that step. The release tasks are gated on it.

**Historical scope.** None. This change adds no historical claim. The
loading lines reuse each chapter's existing briefing text, under its
existing label. The splash's period line is the project's own, labelled
`dramatized` like the book's epigraph.

**Multi-perspective approach and playable figures.** Unchanged. The battle
loading screen names the chapter's commander as the briefing does: Siqueira
Campos, Prestes, Miguel Costa, Isidoro Dias Lopes.

**MVP.**
- The splash with the unsupported-browser message.
- The battle loading screen with real progress and the warm-cache skip.
- The `?v=` on public files.
- `pnpm check:release` inside `pnpm verify`.
- The slow-network e2e.
- `docs/RELEASE.md`.

**Non-goals.**
- Offline play or a service worker.
- Compressing the GLBs (meshopt or Draco) or re-encoding audio and video.
  Worth measuring after the first release, not before.
- A CDN or a custom domain.
- Analytics or telemetry.
- Accounts.
- Audio streaming: on-demand audio loading stays in `ambient-sound-and-voices`
  (task 6.1). The battle loading screen does not wait for sound.
- Changes to CI beyond what the release path needs: `pages.yml` already
  deploys `main` to Pages.

**Legal and ethical note.**
- Publishing distributes everything in the build. The release check is
  the gate that keeps images under a permission request, the review build
  and the book scans (`livros/`, never in git) out of it.
- The splash and loading texts are the project's own, in EN and PT-BR.
- The content warning keeps its place on the first opening, after the
  splash.
- The code ships under AGPL-3.0-or-later. The release doc reminds that the
  published repository must carry `LICENSE` and the asset register
  (`docs/assets.md`).

## Capabilities

### New Capabilities

- `loading-screens`: what the visitor sees while the game loads.
  - The inline opening splash and the unsupported-browser message.
  - The battle loading screen: what it waits for, its progress, the
    warm-cache skip, and failure handling.

### Modified Capabilities

- `delivery`: three new requirements:
  - the release readiness check (`pnpm check:release` in the local gate);
  - versioned public files after a release;
  - the slow-network end-to-end test.

  The release path joins the requirements as a documented, owner-gated
  procedure.

## Impact

- **App:**
  - `apps/game/index.html`: the inline splash and the capability check;
  - `apps/game/src/main.tsx`: hiding the splash once the desk is ready;
  - a new `apps/game/src/ui/BattleLoading.tsx`;
  - `App.tsx`: start a battle after its assets are in;
  - locale strings in EN and PT-BR;
  - CSS.
- **view3d:**
  - a preload entry that loads a map's model files and the soldier with a
    progress callback, reusing `ModelLibrary.include` and the character
    loader;
  - public URLs built through one helper that adds `?v=`.
- **Audio, music, video:** their URLs go through the same helper.
- **Build:** `vite.config.ts` defines the build id (`__BUILD_ID__`).
- **Tools:**
  - `tools/check-release.ts`, the `check:release` script, a step in
    `tools/verify.ts`, and a release budget file;
  - `tools/check-bundle.ts` is unchanged.
- **Tests:**
  - unit tests for the preload's file list and progress, the URL helper,
    and the release check on fixtures;
  - `tests/e2e/slow-network.spec.ts`;
  - the existing e2e suites keep passing. They run on a warm local server,
    so no loading screen shows there.
- **Docs:** `docs/RELEASE.md`, and `docs/status.md` with the first-visit
  size.
- **No simulation change.** Determinism goldens are untouched.
