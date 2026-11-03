## 1. Weapon group

- [x] 1.1 Move both arms and the rifle into a weapon group that points forward in every stance.
- [x] 1.2 Keep the arms supporting the rifle instead of hanging at the sides.

## 2. Prone aiming

- [x] 2.1 Rotate the body face-down in prone and counter-rotate the weapon group so the rifle stays forward.
- [x] 2.2 Raise the prone body and weapon enough to avoid ground clipping.
- [x] 2.3 Keep the selection ring and shadow flat.

## 3. Verification

- [x] 3.1 Capture and inspect standing, crouched and prone screenshots; verify the rifle points forward in all three.
- [x] 3.2 Run `pnpm check` and `pnpm build`.
- [x] 3.3 Run `pnpm e2e`.
- [x] 3.4 Run `openspec validate "refine-aiming-poses" --type change --strict` and `gs42-standards check`/`doctor`.
- [x] 3.5 Produce the delivery report.

