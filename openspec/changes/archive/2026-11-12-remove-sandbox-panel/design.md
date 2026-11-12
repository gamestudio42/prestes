## Context

See proposal.md. The panel's state lives in `hooks/useSandbox.ts`
(open, tool, both sides, fog) and its commands are ordinary simulation
commands (`spawn_cover`, `spawn_dummy`, `reinforce`, `incapacitate`,
`spawn_troop`) accepted only in sandbox mode. The e2e suite already
sends commands through `window.__prestes.command`, defined in
`hooks/useTestBridge.ts` for development builds only.

## Goals / Non-Goals

**Goals:** no sandbox in the player's game; no loss of test coverage;
no change to simulation results (determinism goldens unchanged).

**Non-Goals:** removing sandbox mode from the simulation, which tests and
tools use to build situations.

## Decisions

**D1. The client-side switch moves to the bridge.** Both-sides control is
client state (selection and the fog view), so the bridge gains
`bothSides(on)`, kept in `App.tsx` where `useSandbox` kept it; with both
sides on, the fog view is off, as today. The fog switch was already the
simulation's `fog` command and is sent with `__prestes.command`.

**D2. Commands stay commands.** Reinforce, spawn and incapacitate stay in
the simulation and are sent with `__prestes.command`; nothing in the
protocol changes, so the determinism goldens hold.

**D3. Dead code goes with the panel.** Placement preview and rotation
code (`Z`/`X`) used only by the panel's tools is deleted; anything the
editor or the deployment preview also uses stays. The check is the
TypeScript build and `knip`-style unused-export review in the task.

## Risks / Trade-offs

- [A quick in-battle experiment is no longer one key away] → the editor's
  playtest builds the situation; the bridge covers automated tests.
- [Spec text drifting: "sandbox" still names the simulation mode in
  `simulation`, `terrain`, `weapons`] → those mean the mode, which stays;
  only text about the panel changes here.

## Open Questions

None; the owner decided the removal on 2026-11-11.
