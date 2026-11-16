## 0. Before starting

- [x] 0.1 Read the proposal, design and specs.
  - Mute the game (`prestes.audio.v1`) in the preview pane.
  - Commit with explicit paths.
  - No remote, push or deploy in sections 1-5.
  - Verify: `pnpm check` passes before any change.

## 1. Opening splash and browser check

- [x] 1.1 The inline splash in `apps/game/index.html` (D1): markup, inline style, language choice and the two-entry text table. Add `splash.*` strings to both locales; the period line is labelled `dramatized`.
  - Verify with a unit test that reads `index.html` and compares the inline table with the locales, and with `pnpm check:locales`.
- [x] 1.2 `window.__prestesReady()`, called by the desk once mounted and its art decoded; fade, then hide. The content warning opens after it.
  - Verify with an e2e: the splash is gone and the content warning shows on a first visit; a returning visit goes straight to the desk.
- [x] 1.3 The capability check (D4) and the unsupported message; `main.tsx` does not mount when the check fails.
  - Verify with an e2e that stubs `getContext('webgl2')` to return null: the message names WebGL 2 in EN and in PT-BR, and the console has no error.
- [x] 1.4 The splash at 360 px wide.
  - Verify with an e2e at the mobile preset: no horizontal scroll.

## 2. Battle loading

- [ ] 2.1 `battleAssets(map)` in view3d (D2).
  - Verify with unit tests on fixtures: a cerrado map lists `trees-cerrado` and not the other biomes; an unpainted map has no ground atlas; the order is stable.
- [ ] 2.2 `preloadBattle(list, onProgress)` through the shared caches, with one retry per file and `{ done, total, failed }`; `SceneView` takes the preloaded assets.
  - Verify with unit tests using a fake loader: progress steps to the total, a file that fails once loads on the retry, a file that fails twice is counted as failed, and a second preload of the same list makes no request.
- [ ] 2.3 `App.tsx` awaits the map and the preload before it creates the client (D3); a generation counter drops a start that was overtaken.
  - Verify with a unit test of the start sequence (leave during loading, then start again: only the second battle starts), and the headless check that a cold and a warm start give the same hashes.
- [ ] 2.4 `BattleLoading.tsx`: shown after 300 ms, with the name (chapter number, title and commander, or the map name), the bar with `data-done` and `data-total`, and one briefing or setting line, in EN and PT-BR. Mark the clicked button "loading" until it shows. Add the HUD notice for failed files.
  - Verify with an e2e that delays the GLB responses: the screen shows with rising progress, and the battle opens with no placeholder visible; a forced 404 on one GLB opens the battle with the notice.

## 3. Versioned public files

- [ ] 3.1 `__BUILD_ID__` in `vite.config.ts`, and `publicUrl()` in `packages/shared`; models, textures, sounds, gramophone tracks, the menu video and map previews go through it (D5).
  - Verify with a unit test of the helper, the source guard test (no bare `./models/`, `./audio/`, `./music/`, `./video/` literal outside the helper), and an e2e on the built preview showing that every request under `models/` carries `?v=`.

## 4. Release check and slow network

- [ ] 4.1 `tools/check-release.ts`, `tools/release-budget.json`, the `check:release` script, and the step in `tools/verify.ts` after the build; Vite's manifest is turned on (D6).
  - Verify with unit tests on fixture builds: a pending image, a `compendium-pending` path, a `.map` file, the edit link's string, and a size over the limit each fail with the file named; a clean fixture passes. Then run `pnpm build && pnpm check:release` and note both sizes in `docs/status.md`.
- [ ] 4.2 `tests/e2e/slow-network.spec.ts` on the built preview with CDP throttling (D7).
  - Verify: it passes, and it records the cold-load times of the desk and of one campaign chapter in `docs/status.md`.

## 5. Docs and gate

- [ ] 5.1 Write `docs/RELEASE.md` (PT-BR) with the steps and commands of D8, the check that `main` has no commits of its own, the Pages setting, the checks after deploy, and the AGPL and asset-register reminders.
  - Verify: the doc lists every step of the "Owner-gated release path" requirement.
- [ ] 5.2 Run `pnpm verify`, including `check:release` and the slow-network e2e, and `openspec validate prepare-online-release --type change --strict`.
  - Verify: all pass, noted in `docs/status.md`.
- [ ] 5.3 Hand check by the owner: open the built preview with the browser's network throttling, and watch the splash, the desk, a skirmish's loading screen and a chapter's loading screen.
  - Findings go in `docs/status.md`.

## 6. Release (only on the owner's word, one step at a time)

- [ ] 6.1 The owner names the GameStudio42 repository. Add the remote.
  - Verify: `git remote -v` shows it, and nothing is pushed yet.
- [ ] 6.2 Bring `main` to the release commit by fast-forward, after `git log <working>..main` shows nothing.
  - Verify: `main` equals the working branch's tip.
- [ ] 6.3 Push `main`, once the owner says so; the owner turns on Pages ("GitHub Actions" source) in the repository settings.
  - Verify: the CI run passes and Pages reports the site URL.
- [ ] 6.4 Check the published URL: the splash, the desk, a skirmish and the prologue, on a throttled connection.
  - Verify: findings, and the URL, are noted in `docs/status.md`.
