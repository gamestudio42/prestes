# 0001 — Foundation Decisions

- **pnpm workspace with explicit packages.** The simulation is a separate package
  so the no-DOM/no-renderer boundary can be linted and tested.
- **Deterministic kernel.** xoshiro128** with one engine-owned stream, fixed 100 ms
  ticks and an FNV-1a state hash. Wall-clock time and `Math.random` are forbidden
  in `packages/kernel` and `packages/simulation`.
- **Worker-owned simulation.** The main thread holds a read-only `ClientMirror`;
  all input crosses the command/event protocol.
- **Low-resolution graybox.** The scene renders at half resolution and upscales
  with nearest-neighbour; the React HUD stays sharp. Final art is deferred.
- **English source, PT-BR/EN locales.** Every player-facing string comes from the
  catalog; JSX text literals are rejected by lint and the locale check.
- **Historical source policy.** Macaulay is Tier 0 for chronology; Amado is tone;
  Blanc is social/interior history; regional studies are Tier 3; the MVCP portal
  is a finding aid. Conflicts are logged.
- **No DRM bypass or scan redistribution.** Book scans and OCR text stay under
  `livros/`, which is gitignored. Only paraphrased notes with page citations enter
  the repository.
