## 1. Boot camp cleanup

- [x] 1.1 Remove the three training targets and mark Contact paused; verify no dummy spawns in active chapters.
- [x] 1.2 Make the tutorial director use active chapters and map a saved Contact checkpoint to Orders.
- [x] 1.3 Update the boot-camp acceptance run and content test for five active chapters; verify the full boot camp E2E passes.

## 2. Defend formation and facing

- [x] 2.1 Add an optional facing axis to formation slots and use the threat axis for defend/ambush; verify destinations stay on the near side of a wall.
- [x] 2.2 Reject cover candidates across the chosen cover and reserve used cover points; verify distinct destinations and no stacking.
- [x] 2.3 Make defending and ambushing soldiers face the threat when idle; verify facing matches the preview cone.

## 3. Verification

- [x] 3.1 Run `pnpm check` and record the 150-test result.
- [x] 3.2 Run `pnpm build`, `pnpm e2e` and two `pnpm sim` runs; record bundle size and hash.
- [x] 3.3 Update status/architecture and run `openspec validate`.
