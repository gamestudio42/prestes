## 1. Workspace and tooling

- [x] 1.1 Create the pnpm workspace with `apps/game`, `packages/kernel`, `packages/shared`, `packages/simulation`, `packages/view3d`, `packages/content`, `tools`, `tests` and `docs`; verify `pnpm install` succeeds and `pnpm -r list --depth -1` shows every package.
- [x] 1.2 Add root scripts `dev`, `build`, `typecheck`, `lint`, `test`, `check` and `e2e`, plus the Node 22/pnpm 10 runtime contract; verify `pnpm run` lists them and `pnpm typecheck` exits zero on the empty packages.
- [x] 1.3 Add strict TypeScript configs, ESLint flat config and Prettier config; verify `pnpm typecheck` and `pnpm lint` pass on the skeleton.
- [x] 1.4 Add `.gitignore`, `.gitattributes`, `LICENSE` (AGPL-3.0-or-later), `README.md`, `docs/architecture.md`, `docs/assets.md` and `docs/decisions/`; verify the files exist and the README commands match `package.json`.
- [x] 1.5 Re-run `gs42-standards init --detect` now that `package.json` exists; verify `gs42-standards check` and `gs42-standards doctor` report OK and the profile includes `web-game` when React is present.

## 2. Deterministic kernel

- [x] 2.1 Implement the seeded xoshiro128** RNG in `packages/kernel`; verify a unit test reproduces a fixed seed sequence and two engines with the same seed match.
- [x] 2.2 Implement the FNV-1a state hash helper in `packages/kernel`; verify unit tests show a stable hash for equal state and a different hash after a mutation.
- [x] 2.3 Add fixed-step constants and tick helpers (`TICK_DT = 0.1`, max ticks per frame); verify a unit test covers the 10 Hz conversion and the cap.
- [x] 2.4 Configure ESLint to reject `Math.random`, `Date`, `performance` and forbidden transcendental functions in `packages/kernel` and `packages/simulation`; verify a temporary bad snippet fails lint, then remove it and confirm `pnpm lint` passes.
- [x] 2.5 Define command, event, rejection-reason and frame types in `packages/shared`; verify typecheck and a serialization unit test pass.
- [x] 2.6 Implement the simulation engine skeleton (`enqueue`, `tick`, `runTicks`, `frame`, `hashState`); verify a headless unit test applies a command script and produces a final hash.
- [x] 2.7 Implement the headless runner in `tools/`; verify two runs with the same seed and command script print the same hash, and a different seed prints a different hash.
- [x] 2.8 Add determinism tests: same seed/commands match at every checked tick, different seeds diverge, and a no-command run keeps the hash stable; verify `pnpm test` passes.

## 3. Worker host and client mirror

- [x] 3.1 Implement the worker entry that owns the engine and handles command and frame messages; verify a worker integration test advances ticks and returns frames.
- [x] 3.2 Implement the read-only client mirror and frame interpolation buffer; verify a unit test shows the mirror changes only from frames and never exposes a mutable engine.
- [x] 3.3 Wire the app boot to the worker and advance the tick after the start action; verify the browser smoke test observes a tick counter above zero.
- [x] 3.4 Route an intentionally invalid command through the worker and surface the rejection event in the debug log; verify the event appears and the state hash does not change.

## 4. Presentation

- [x] 4.1 Create the Vite + React app shell with a start screen (title, language selector, start action); verify the start screen loads in the browser.
- [x] 4.2 Add a Three.js graybox scene with placeholder terrain, one building block and unit markers; verify all three are visible in the scene.
- [x] 4.3 Implement the strategic and tactical camera bands with pan, rotate, zoom and an active-band indicator; verify the controls move the camera and the indicator updates.
- [x] 4.4 Implement the low-resolution render target with nearest-neighbour upscale and a native-resolution HUD; verify the internal size is below the display size and the HUD remains sharp.
- [x] 4.5 Add the HUD shell (tick, band, placeholder selection summary) reading the client mirror; verify the tick advances without HUD-owned state.
- [x] 4.6 Register every graybox asset and placeholder in `docs/assets.md`; verify each placeholder is named `placeholder` or `TODO` and appears in the register.

## 5. Localization

- [x] 5.1 Add the English source catalog and PT-BR/EN locale files with the start-screen keys; verify the start screen renders from the catalog.
- [x] 5.2 Add the typed translation helper and language switch with persistence; verify switching updates the UI without reload and the choice survives a reload.
- [x] 5.3 Add the key-set validation script and wire it into `pnpm check`; verify a temporarily removed PT-BR key fails the check with the key name, then restore it.
- [x] 5.4 Add browser-language default logic for PT-BR/EN and a fallback to English; verify unit tests cover PT-BR, EN and an unsupported locale.
- [x] 5.5 Add a Playwright smoke test that switches from English to PT-BR; verify `pnpm e2e` passes.

## 6. Historical content

- [x] 6.1 Create `docs/history/SOURCES.md` with Macaulay (Tier 0), Amado (tone), Blanc (social/interior), Hélio Silva, Anita Prestes, regional studies and the MVCP portal as a finding aid; verify every key used by the registry exists and each entry records its consultation status.
- [x] 6.2 Create `docs/history/TIMELINE.md` with the 1922–1927 chronology, Macaulay page citations and confidence levels; verify the Forte absence, the separate Sao Paulo front, the command relationship and the 1920s borders are recorded.
- [x] 6.3 Create `docs/history/FIGURES.md` with Siqueira Campos and Luis Carlos Prestes entries (role, playable flag, labels, sources); verify each entry cites a source key.
- [x] 6.4 Implement the figure registry in `packages/content/src/figures.ts`; verify unit tests accept valid figures and reject missing sources, non-playable commanders and unknown commanders.
- [x] 6.5 Implement the content-label type and codex entry validation; verify a unit test rejects an entry without a label and accepts historical, dramatized and fictional labels.
- [x] 6.6 Add a minimal codex panel that lists the two figures and displays their labels; verify the panel shows the label for each entry in the browser.
- [x] 6.7 Add the source-resolution test that checks every `sourceRefs` key against the source list; verify the test fails on an unknown key and passes on the current registry.

- [x] 6.8 Create `docs/history/SOURCE_POLICY.md` with the Tier 0–4 hierarchy and conflict rule; verify Macaulay is Tier 0 for chronology, Amado is tone, Blanc is social/interior, and the MVCP portal is a finding aid.
- [x] 6.9 Create `docs/history/MACAULAY_NOTES.md` from the extracted text; verify each key fact cites a chapter/page and the file contains no verbatim passages longer than a short citation.
- [x] 6.10 Add `livros/` to `.gitignore` and verify no book scan, OCR text or extracted map is tracked; document that DRM is never bypassed.
- [x] 6.11 Build the chapter source matrix for the Prologue and “O Anel de Ferro” with at least two independent sources per chapter; verify every row names its sources and unresolved gaps.

## 7. Delivery

- [x] 7.1 Implement `pnpm check` as typecheck + lint + unit tests + localization/content validation; verify it passes on the clean tree and fails on an introduced type error.
- [x] 7.2 Configure Vite to build `apps/game/dist` with a relative base; verify `apps/game/dist/index.html` exists and the build loads from a nested path.
- [x] 7.3 Add the Playwright config and browser smoke test; verify `pnpm e2e` reaches the start screen and switches language.
- [x] 7.4 Add the GitHub Actions workflow: check on push/PR, upload and deploy on main; verify the YAML is valid and references the same scripts used locally.
- [x] 7.5 Write the README with setup, commands, current scope and placeholder status; verify every documented command exists in `package.json`.
- [x] 7.6 Add the architecture note and asset register check to the docs; verify the docs describe the simulation/presentation boundary and list every placeholder.

## 8. Verification and handoff

- [x] 8.1 Run `pnpm check` and `pnpm build`; verify both exit zero and record the output.
- [x] 8.2 Run `pnpm e2e`; verify the smoke test passes and record the result.
- [x] 8.3 Verify the simulation package has no import of Three.js, React, DOM or Node APIs; verify the lint boundary test passes.
- [x] 8.4 Run `openspec validate "add-prestes-foundation" --type change --strict`; verify it exits zero.
- [x] 8.5 Run `gs42-standards check` and `gs42-standards doctor`; verify both report OK.
- [x] 8.6 Update the README and status note with what is implemented, what is placeholder and what is deferred; verify no placeholder is described as a finished system.
- [x] 8.7 Produce the delivery report with design intent, changes, files, executed checks and remaining risks; verify it distinguishes design intent from verified work.
