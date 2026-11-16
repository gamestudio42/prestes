## Context

See proposal.md for why. Today:

- The player always commands the `column` faction; the enemy is the
  `legalist` faction under the enemy commander
  (`systems/enemy-commander.ts`), which reads its tempo and thresholds from
  module constants (`THINK_EVERY = 10`, `ADVANTAGE = 1.4`,
  `RETAKE_TICKS = 600`, `LAST_MINUTES_TICKS = 1800`, `QUIET_TICKS = 300`).
- A shot's hit chance is computed in `systems/combat.ts` (aimed fire, around
  line 393; area fire in `areaHitChance`); morale losses from fire, nearby
  losses and officers are applied in `combat.ts` and `systems/morale.ts`,
  rallying in `morale.ts` (`SELF_RALLY_RATE`, `COMMAND_RATE`).
- A soldier's reserve is set in `systems/spawning.ts` from his weapon
  profile and his section type's `ammunitionFactor`.
- Fire control is already three-state in code and HUD: `FireControl =
  'free' | 'contact' | 'hold'` in `shared/protocol.ts`, the `fire_control`
  command, and the Fire row of `OrderBoard.tsx`.
- The skirmish setup state (`ui/menu/setupState.ts`) stores map, roster,
  enemy and time limit in local storage with validation and fallbacks; the
  time limit travels to the worker as `timeLimitTicks` on `start`.
- `tools/battle-report.ts` runs the 3v3 headless with a scripted player;
  `tools/check-determinism.ts` keeps goldens with a recorded reason.
- Voice lines are planned in `ambient-sound-and-voices` (5.1 catalog,
  5.3 voice director, 5.4 playback, 5.5 captions); its draft script
  `docs/audio/ROTEIRO_RASCUNHO.md` lists the order board's lines and no
  fire control lines.

The simulation/presentation boundary is unchanged: the level is chosen in
the React setup screen, sent once in the `start` request, and lives only in
the simulation's context from then on. The simulation reads no storage, no
DOM and no clock; the kernel's fixed tick, seeded RNG and `hashState()`
stay the oracle. No art, low-poly models or content schema change beyond
one icon slice and locale keys.

## Goals / Non-Goals

**Goals:**

- One table of factors, the only place the levels differ; no `if (level
  === ...)` scattered through systems.
- Today's constants become the factor 1.0 baseline so each factor is a
  multiplier on a known value.
- Measurable separation between levels, checked in `pnpm verify`.

**Non-Goals:**

- Per-map or per-mission difficulty overrides.
- Exposing individual factors to the player (no custom level).

## Decisions

### D1. A factor table in `packages/shared`

```ts
export type Difficulty = 'historia' | 'soldado' | 'oficial';
export const DIFFICULTIES: readonly Difficulty[] = ['historia', 'soldado', 'oficial'];
export const DEFAULT_DIFFICULTY: Difficulty = 'soldado';
export interface DifficultyFactors {
  enemyAim: number;            // × enemy hit chance (aimed and area)
  commanderThinkEvery: number; // × THINK_EVERY (higher = slower)
  commanderAdvantage: number;  // replaces ADVANTAGE
  commanderRetake: number;     // × sections sent to retake; 0 = never retakes
  commanderLastMinutes: number;// × LAST_MINUTES_TICKS (higher = earlier push)
  playerMoraleLoss: number;    // × every morale loss of the player's side
  playerRally: number;         // × rally rates of the player's side
  playerReserve: number;       // × reserve after the type's factor
}
```

Starting values (tuned in task 4; the spec only fixes their ordering and
the Oficial reserve):

| factor | História | Soldado | Oficial | today |
| --- | --- | --- | --- | --- |
| enemyAim | 0.70 | 0.90 | 1.10 | 1.00 |
| commanderThinkEvery | 2.0 | 1.2 | 0.7 | 1.0 |
| commanderAdvantage | 2.0 | 1.55 | 1.25 | 1.4 |
| commanderRetake | 0 | 1 | 1.5 | 1 |
| commanderLastMinutes | 0.5 | 1.0 | 1.5 | 1.0 |
| playerMoraleLoss | 0.6 | 1.0 | 1.15 | 1.0 |
| playerRally | 1.6 | 1.0 | 0.8 | 1.0 |
| playerReserve | 1.0 | 1.0 | 0.6 | 1.0 |

Applied 2026-11-15: Soldado's morale factors stay at 1.0. The morale and
historical-commander specs state exact figures (a man at 60 falls to 35 when
the figure falls, an officer loss of 20); at 1.0 they hold at Soldado, the
default level, without rewriting those specs. Soldado is gentler than before
through the enemy's aim and commander instead.

The engine also takes `factors` (a partial table over the level's) for tests
and tuning; the game never sends it, and an override is hashed. Emergent-
behaviour tests tuned to the old balance pin `PRE_LEVEL_FACTORS`
(`packages/simulation/test/fixtures/pre-levels.ts`).

Alternative considered: per-system level switches. Rejected: scatters the
balance and makes the check's "which factor moved" unreadable.

Alternative considered: give the enemy more men at Oficial. Rejected: the
spec keeps forces fixed by level so maps and presets stay the owner's.

### D2. The level lives in `SimContext`

`start` gains `difficulty?: Difficulty`; the engine resolves it (absent →
Soldado), stores `ctx.difficulty` and `ctx.factors`, and folds the level
into `hashState()` as one more field. Systems read `ctx.factors`. The
player's side is the `column` faction, the enemy side `legalist`, as today.
Battle-event arrivals (`battle-events.ts` → `spawnSection`) go through the
same spawning path, so a Column section arriving at Oficial also carries
the reduced reserve.

### D3. Economical fire

`FireControl` becomes `'free' | 'economy' | 'contact' | 'hold'`. In the
fire step a soldier under `economy`:

- picks a target only within `0.6 × weapon.range` (target choice, not just
  the shot, so he does not turn and wait on a far man);
- after an aimed shot sets `cooldown = ceil(1.5 × weapon.fireIntervalTicks)`
  and his next shot's chance gets `× 1.15` before the existing clamp;
- for burst weapons draws `rounds = burst.rounds[0]` instead of the range.

`area` and `suppress` orders bypass these rules, as they already bypass
hold fire. The enemy commander never issues `economy`. Concealment's
"fire control set" check (`concealment.ts:73`) treats `economy` like any set
control. The HUD button uses a new icon slice in the icon sheet (an open
cartridge box mark), and the existing "icon map covers the catalogue" test
guards it.

### D4. Fire control voices

The four settings join the voice line catalog as order-like entries with
ids `fire-free`, `fire-economy`, `fire-contact`, `fire-hold`, played by the
voice director on the `fire_control` command, under the same queueing and
refusal rules as orders. Draft lines for the owner's review (the catalog
is the source of truth once it exists):

| id | Comandante (`comandante/<id>-1..3`) | Resposta (`soldado/<id>-ack-1..3`) |
| --- | --- | --- |
| fire-free | "Fogo à vontade!" · "Atirem à vontade!" · "Fogo livre, pessoal!" | "Fogo à vontade!" · "Atirando!" · "Pode deixar!" |
| fire-economy | "Só atirem quando virem o branco dos olhos deles!" · "Poupem bala! Cada tiro, um inimigo!" · "Nada de gastar à toa, mirem bem!" | "Poupando bala!" · "Só no certo, senhor." · "Esperando eles chegarem!" |
| fire-contact | "Ninguém atira antes da hora!" · "Esperem eles chegarem perto!" · "Fogo só se chegarem em cima!" | "Esperando!" · "Quando chegarem, senhor." · "Dedo fora do gatilho." |
| fire-hold | "Segurem o fogo!" · "Ninguém atira!" · "Cessar fogo!" | "Segurando!" · "Ninguém atira." · "Cessar fogo!" |

Captions (the owner, 2026-11-15: "a legenda fica após as frases gravadas
também"): the fire control line is always captioned, recorded or not. The
caption is the HUD's existing order callout: the commander's bubble over the
section's officer and the section's answer over the men. A section with no
officer (a Fogão) carries the command and the answer in its own bubble, so
the line is never lost.

The owner's line is an old military saying (best known from the American
War of Independence); it is used as a dramatized command and makes no
claim that the Column used it. If this change lands before the voice
director (ambient-sound-and-voices 5.3), the lines are added to the
catalog and the script only, and the playback task waits for it.

### D5. Setup screen and storage

`SkirmishSetup` gains a `difficulty` field; `setupState.ts` validates it
against `DIFFICULTIES` and falls back to Soldado, like the time limit. The
choice is a three-button radio group in the same block as the time limit,
with the selected level's description under it. The result screen reads
the level from the final frame (the frame carries it, so a replayed or
headless outcome names it too).

### D6. Tuning and the check

`battle-report.ts` and `headless-sim.ts` take `--difficulty`; the report
also takes `--factors '<json>'` and `--economy` for tuning. A new
`tools/check-difficulty.ts` runs the battle report's scripted player on the
default skirmish map over seeds 1–20 at each level, in parallel child
processes, and fails outside the casualty-exchange bands of the spec
(História ≤ 0.85, Soldado 0.85–1.2, Oficial ≥ 1.2, rising), printing each
level's exchange and win rate. It joins `pnpm verify` as a slow step.

Changed 2026-11-15 after 340 measured battles: the first version banded the
win rate (≥ 80 %, 45–70 %, 15–40 %). Over 20 seeds the win rate was mostly
chance (a harsher Oficial won 8/20, a milder one 4/20), while the
casualties climbed steadily with the level; the owner chose the casualty
exchange. The scripted player also fights in free fire at every level: it
holds its line and waits, so under economical fire (72 m for the Mauser) it
hardly fired and lost every battle at Oficial. Its 27-round Oficial reserve
never ran dry either, so the reserve does not show in the measurement; it
is for the human player, who spends faster.

Final table (task 4.3, 2026-11-15), measured by `pnpm check:difficulty`:

| factor | História | Soldado | Oficial | before |
| --- | --- | --- | --- | --- |
| enemyAim | 0.6 | 0.95 | 1.3 | 1.0 |
| commanderThinkEvery | 2.0 | 1.2 | 0.5 | 1.0 |
| commanderAdvantage | 2.0 | 1.55 | 1.1 | 1.4 |
| commanderRetake | 0 | 1 | 1.5 | 1 |
| commanderLastMinutes | 0.5 | 1.0 | 1.5 | 1.0 |
| playerMoraleLoss | 0.6 | 1.0 | 1.3 | 1.0 |
| playerRally | 1.6 | 1.0 | 0.6 | 1.0 |
| playerReserve | 1.0 | 1.0 | 0.6 | 1.0 |
| casualty exchange | 0.71 | 0.97 | 1.38 | 1.03 |
| scripted wins (information) | 13/20 | 13/20 | 8/20 | 12/20 |

Soldado's enemy aim went from 0.9 to 0.95: at 0.9 the battle-feel seed
1922 had a 123.7 s silence (band 120 s); at 0.95 the three battle-feel
seeds hold their bands.

## Risks / Trade-offs

- [The scripted player is not a human; bands met by the script may feel
  wrong in play] → the owner plays each level (task 6.3) and factors are
  retuned within the bands; the bands themselves can be revised by an
  update to this change.
- [Rebalancing Soldado changes today's outcomes and goldens] → re-record
  the goldens once, with reason "add-difficulty-levels: Soldado
  rebalanced", and re-run the battle-events and objectives tests that
  assert outcomes; where a test asserts today's balance, pin it to a level
  explicitly.
- [Economical range at 60 % (72 m for the Mauser) is not literally "the
  whites of their eyes"] → the line is a figure of speech; the contact
  setting (25 m) is the literal one. If the owner prefers, the line can
  move to `fire-contact` with no spec change beyond its quoted text.
- [Oficial plus economical fire may leave the scripted player unable to
  win] → the battle report's scripted player switches to economical fire
  at Oficial, so the band measures the intended play.
- [The voice director may not exist when this is applied] → D4 fallback:
  captions-only behaviour is already the spec's rule for unrecorded lines.

## Migration Plan

Local only. Older saved setups load at Soldado; older callers of `start`
get Soldado. No map document version change. Rollback is a revert of the
change's commits plus the goldens.
