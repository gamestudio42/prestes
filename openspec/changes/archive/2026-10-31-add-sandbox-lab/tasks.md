## 1. Shared sandbox model

- [x] 1.1 Move cover ownership to the frame: add `covers` to `Frame`, parameterize `coverAgainst` and export cover kinds; verify existing world tests and a new frame serialization test.
- [x] 1.2 Add `spawn_cover`, `spawn_dummy`, sandbox mode and rejection reasons; verify invalid kind/position tests and hash changes.

## 2. Simulation

- [x] 2.1 Accept dynamic sandbag, stone and trench covers, validate positions and emit them in every frame; verify cover seeking/fire use the new set.
- [x] 2.2 Add stationary dummy units that can be targeted but do not move, fire, count for outcome or join enemy AI; verify player fire and dummy filtering.
- [x] 2.3 Keep reset deterministic and all existing combat tests green; verify two sandbox runs produce the same hash after identical spawn commands.

## 3. View

- [x] 3.1 Render dynamic cover from `Frame.covers` and remove the static sandbag loop; verify a spawned cover appears and can be used.
- [x] 3.2 Render dummies as target boards, with selection and hit feedback; verify they are not shown as soldiers.

## 4. Sandbox panel

- [x] 4.1 Add a `F1`/button panel with selected-unit inspector, reset and step controls; verify keyboard and button paths.
- [x] 4.2 Add cover and dummy spawn tools with a placement prompt; verify commands are sent through the worker.
- [x] 4.3 Add PT-BR/EN labels; verify key parity and no hardcoded player text.

## 5. Verification

- [x] 5.1 Update architecture/status/assets for the sandbox lab; verify no placeholder is called final.
- [x] 5.2 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate "add-sandbox-lab" --type change --strict`, and two `pnpm sim` runs; verify matching hashes.
- [x] 5.3 Mark tasks complete, archive, and verify `openspec validate --specs` and `--archived`.

