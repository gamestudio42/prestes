# AGENTS.md

## GameStudio42 standards

This repo uses the vendored GameStudio42 standards in `.gs42/standards/`
(profiles: `core`, `web-game`). Read `.gs42/standards/AGENTS.md`, the applicable
rules and the skills before changing code or design. `opencode.json` loads those
files as instructions. If local instructions conflict with them, report the
conflict and prefer the task, the user's authorization and this repository.

## What this repo is

**Prestes** â€” a historical tactical RTS about Luis Carlos Prestes and the Coluna
Prestes (1922â€“1927), for the browser, in 3D low-poly. OpenSpec 1.13
(`spec-driven` schema) is the planning source of truth; the game code is built
in the apply phase. The `openspec` CLI must be on `PATH`.

Stack: TypeScript strict, pnpm monorepo, Vite, React HUD, Three.js, deterministic
simulation in a Web Worker, Vitest, Playwright, GitHub Pages. Code and OpenSpec
artifacts in English; English is the source language for player strings, with
PT-BR and EN locales. License AGPL-3.0-or-later.

The code lives in `apps/game` plus `packages/kernel`, `shared`, `simulation`,
`view3d` and `content`. The game is a playable skirmish on authored maps
(deployment phase, objectives, fog of war, garrisons, rostered sections); the
bootcamp is retired and the campaign is written but not playable. Battle maps
are authored by the owner by hand in the in-game editor (`editor.html`): do
not generate maps or hand-write them in code. Current state and the plan are
in `docs/status.md`; durable specs live in `openspec/specs/`; finished
changes are under `openspec/changes/archive/`.

## Layout

- `openspec/specs/<capability>/spec.md` â€” durable specs (current truth).
- `openspec/changes/<change>/` â€” in-flight change: `proposal.md`, delta
  `specs/<capability>/spec.md`, `design.md`, `tasks.md`.
- `openspec/changes/archive/` â€” archived changes (never edit directly).
- `openspec/config.yaml` â€” project `context` and per-artifact `rules`.
- `.agents/skills/openspec-*/SKILL.md` â€” propose, apply, archive, sync-specs,
  update, explore workflows. Read the matching one before running it.

## Workflow

Explore â†’ propose â†’ apply â†’ archive.

- **Never hand-create a change directory.** Run
  `openspec new change "<kebab-name>"` so `.openspec.yaml` metadata exists.
- **Propose is planning-only**: create artifacts, never edit code. Apply is the
  only workflow that implements. Do not start apply in the same turn as
  propose; wait for an explicit request.
- **Archive** merges delta specs into main specs, then moves the change into
  `archive/`. Never archive while a spec sync is still in flight.

## Commands (from repo root)

```bash
openspec context --json                                  # resolve root, read config
openspec list --json                                     # active changes
openspec list --specs --json                             # durable capabilities
openspec status --change "<name>" --json                  # artifacts, paths, deps
openspec instructions <artifact> --change "<name>" --json # template, rules, output
openspec validate --specs
openspec validate "<change>" --type change --strict
openspec archive
```

## App commands (from repo root)

```bash
pnpm install
pnpm check       # typecheck, lint, tests, locale, content and map checks
pnpm verify      # the full local gate: check, build, budgets, determinism, OpenSpec, e2e
pnpm e2e         # Playwright browser suite
pnpm build       # static build in apps/game/dist
pnpm sim         # headless deterministic run
pnpm models      # export character source models to GLB
```

## Gotchas

- `packages/simulation` and `packages/kernel` must not import Three.js, React,
  the DOM, Node APIs or wall-clock time. ESLint enforces this; do not weaken it.
- Every player-facing string goes through the locale catalog. JSX text literals
  are rejected by lint and `pnpm check:locales`.
- Book scans, OCR text and extracted maps live under `livros/`, which is
  gitignored. Never commit or redistribute them; use paraphrased notes and page
  citations. See `docs/history/SOURCE_POLICY.md`.
- Macaulay is Tier 0 for chronology; Amado is tone; Blanc is social/interior
  history. Log conflicts in `docs/history/TIMELINE.md`.
- Build artifacts in dependency order from `status --json` (`applyRequires`
  plus transitive `requires`), not from a fixed file list. Status is
  file-existence only: a `done` artifact still lists what it depends on.
- Write to `resolvedOutputPath` when it is a concrete path; for glob artifacts
  use the concrete files in `artifactPaths.<id>.existingOutputPaths` (from
  `status`), never the glob.
- Main specs have one `## Requirements` section. `## ADDED/MODIFIED/REMOVED/
  RENAMED Requirements` headers belong only in delta specs. When merging,
  preserve scenarios the delta does not mention.
- `config.yaml` `context` and `rules` constrain how you write; never copy their
  text into artifacts.
- Artifact filenames above are schema defaults; confirm ids and paths via
  `openspec status` / `openspec instructions` before writing.

