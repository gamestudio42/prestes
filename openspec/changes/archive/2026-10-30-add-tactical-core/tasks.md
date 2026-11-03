## 1. World and protocol

- [x] 1.1 Add shared world helpers: building rectangle, cover points, fire range, cover calculation and LOS blocking.
- [x] 1.2 Extend unit snapshots with squad, health, ammunition, morale, alive, suppressed and cover; add outcome to frames.
- [x] 1.3 Add attack/hold commands and shot/hit/death/outcome events.
- [x] 1.4 Update shared fixtures and tests; verify typecheck.

## 2. Simulation combat

- [x] 2.1 Add two player squads and one legalist squad with health, ammo and morale.
- [x] 2.2 Implement target acquisition, line of sight, range, hit chance, damage, cooldown, ammo and automatic reload.
- [x] 2.3 Implement cover from stance and sandbags and the building LOS/movement block.
- [x] 2.4 Implement morale, suppression and the low-morale accuracy penalty.
- [x] 2.5 Implement attack/hold commands, outcome victory/defeat and enemy auto-engagement.
- [x] 2.6 Add deterministic combat, cover, ammo, morale, command and outcome tests.

## 3. Presentation

- [x] 3.1 Render sandbag cover props at the shared cover points.
- [x] 3.2 Add tracer lines for shot events.
- [x] 3.3 Make dead units lie down and hide their selection ring.
- [x] 3.4 Add screen picking for friendly units, enemies and ground points.

## 4. HUD and input

- [x] 4.1 Add section cards with alive count, health, ammo and morale; show objective and outcome.
- [x] 4.2 Left-click selects a friendly section; right-click moves or attacks.
- [x] 4.3 Apply stance commands to the selected section.
- [x] 4.4 Add pause and 1Ã—/2Ã—/4Ã— speed controls to the client.
- [x] 4.5 Add PT-BR/EN labels for sections, speed, objective, outcome and attack rejection.

## 5. Verification

- [x] 5.1 Run `pnpm check` and `pnpm build`.
- [x] 5.2 Run `pnpm e2e`; verify selection, pause/speed, movement/attack input and HUD status.
- [x] 5.3 Capture and inspect a combat screenshot with tracers, cover and status.
- [x] 5.4 Run `openspec validate "add-tactical-core" --type change --strict` and `gs42-standards check`/`doctor`.
- [x] 5.5 Produce the delivery report.

