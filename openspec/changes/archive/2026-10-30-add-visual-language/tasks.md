## 1. Dependencies and protocol

- [x] 1.1 Add `@fontsource/barlow`, `@fontsource/barlow-condensed`, `lucide-react` and `@gltf-transform/core`/`functions`; verify `pnpm install` succeeds.
- [x] 1.2 Add `Faction`, `OrderKind` and `OrderPath` to `packages/shared`; verify typecheck and protocol serialization tests.
- [x] 1.3 Add `faction` to unit snapshots and `orders` to frames in the simulation; verify the simulation tests and headless hash run.
- [x] 1.4 Ensure order metadata is excluded from the world hash and invalid commands create no order; verify unit tests.

## 2. Camera

- [x] 2.1 Implement `CameraRig` with orthographic span, tactical/strategic tilt, clamp, zoom, rotate, pan and band readout; verify unit tests for span/band/clamp.
- [x] 2.2 Add texel snapping and continuous span easing; verify the camera does not crawl during a pan in a screenshot.
- [x] 2.3 Wire WASD/arrows, Q/E and wheel to the rig; verify the HUD band changes from tactical to strategic.

## 3. Post, palette and materials

- [x] 3.1 Add the Prestes `PALETTE` and three-band toon material; verify the scene uses only palette colours.
- [x] 3.2 Implement `PixelPost` with depth outline, bloom, soft shoulder, grade, 24-level Bayer posterize and vignette; verify the internal target is below display size.
- [x] 3.3 Add a strong/clean post toggle; verify the toggle changes the composite without reloading.

## 4. Characters

- [x] 4.1 Implement the 1.75 m modular character proxy (body, head, officer cap, gaúcho hat, rifle, scarf) with faction colours; verify soldier and officer are visible.
- [x] 4.2 Implement `unitScale = max(1, span / 60)`; verify unit screen size at tactical and strategic spans.
- [x] 4.3 Replace the old unit markers in `SceneView`; verify no `placeholder-unit` marker geometry remains except the named character proxy.

## 5. Movement paths

- [x] 5.1 Implement `PathLayer` with one dashed `LineSegments` buffer, waypoint crosses and order markers; verify a unit test builds the expected vertex count.
- [x] 5.2 Draw `Frame.orders` for active move orders and clear them on arrival; verify the path count in the HUD.
- [x] 5.3 Add a debug “move column” action; verify a dashed route appears and the path count is greater than zero.
- [x] 5.4 Verify arrival clears the route and returns the path count to zero.

## 6. UI

- [x] 6.1 Self-host Barlow/Barlow Condensed and restyle the start screen, HUD and codex; verify no external font request in the build.
- [x] 6.2 Add Lucide icons for move, codex, language, debug and post; verify icons are decorative and labelled actions remain accessible.
- [x] 6.3 Add locale keys for post mode, path count and the debug move; verify `pnpm check:locales`.
- [x] 6.4 Add a post toggle control; verify the E2E test changes the mode.

## 7. Asset pipeline and docs

- [x] 7.1 Add `tools/prepare-models.ts` and `pnpm models` using glTF-Transform; verify the command runs and reports the expected output directory.
- [x] 7.2 Create the `art-src/characters/` source layout and `.gitignore` rules; verify no large source file is committed unintentionally.
- [x] 7.3 Update `docs/assets.md` with original meshes (CC-BY-4.0), Barlow (OFL) and Lucide (ISC); verify the register lists every new asset.
- [x] 7.4 Update `docs/architecture.md`, `docs/decisions/0002-visual-language.md`, `README.md` and `docs/status.md`; verify they describe the new camera, post and path layers.

## 8. Verification

- [x] 8.1 Run `pnpm check`; verify typecheck, lint, tests, locales and content pass.
- [x] 8.2 Run `pnpm build`; verify `apps/game/dist` and the nested-path load.
- [x] 8.3 Run `pnpm e2e`; verify language, start, camera bands, debug path, arrival clear, post toggle and codex.
- [x] 8.4 Capture and inspect a screenshot of the new scene; verify terrain, building, at least two characters and a dashed path are visible.
- [x] 8.5 Run `openspec validate "add-visual-language" --type change --strict` and `gs42-standards check`/`doctor`.
- [x] 8.6 Produce the delivery report with design intent, changes, checks and remaining risks.
