## Context

- The book menu (`apps/game/src/ui/StartScreen.tsx`) has bookmarks Campaign,
  Skirmish, Compendium and Options; the compendium already turns pages with
  corners and arrow keys. `PixelVideo` draws the menu video pixel-filtered.
- The dev bridge (`window.__prestes`: `command`, `step`, `frame`;
  `window.__prestesScene`: `focusOn`, `setBand`, `groundToScreen`, `pick`)
  lets Playwright drive a battle deterministically. Playwright can record a
  page to WebM (`recordVideo`).
- The sandbox commands spawn troops and dummies (`spawn_troop`,
  `spawn_dummy`), set non-lethal fire, hold fire, and the engine accepts a
  battle map. The 3v3 seed is fixed (1922).
- Left over from the bootcamp: `packages/shared/src/training-ground.ts`
  (course map, stations), `TrainingLayer` in the view, the
  `training_phase` / `despawn_role` commands, the `training-enemy` role and
  the instructor follow in movement.

## Goals / Non-Goals

**Goals:** a Manual of ten short lessons on the three battlefields, videos
recorded from the game by a deterministic tool, captions from the locale
catalog in both locales, a player with fallback, "Experimentar", progress,
and the training-ground code removed.

**Non-Goals:** interactive drills with objectives, narration, music,
editing, a campaign.

## Decisions

### 1. A lesson scenario, not a 3v3

Recordings need few units and full control. The engine gains
`scenario: 'lesson'`: a battle map, no units at start, fog off unless the
script turns it on, no enemy commander, `sandbox` true. The script places
units with `spawn_troop` (sections of the player or the enemy, optionally
non-lethal or holding fire) and dummies. `hashState()` is the reproducibility
oracle per scripted tick.

### 2. Lesson data

`packages/content/src/lessons.ts`:

```ts
interface Lesson {
  id: string; number: number;
  titleKey: MessageKey; textKeys: MessageKey[];     // 2-4 short paragraphs
  map: BattleMapId;
  teaches: TeachingTopic[];                          // for the content check
  video: string; still: string;                      // public paths
  cues: Array<{ at: number; until: number; key: MessageKey }>;  // seconds
  script: LessonStep[];
}
type LessonStep =
  | { at: number; spawn: { faction; count; x; y; rotation?; nonLethal?; holdFire? } }
  | { at: number; dummy: { x; y } }
  | { at: number; command: Command }                 // ids resolved by squad
  | { at: number; camera: { x; y; band: CameraBand; durationTicks } }
  | { at: number; cursor: { x; y; click?: 'left' | 'right'; key?: string } }
  | { at: number; highlight: { kind: 'ring' | 'arrow'; x; y; untilTicks } }
  | { at: number; fog: boolean };
```

`at` is in ticks of the lesson's clock (10 per second). Command unit ids are
written as `{ squad: n }` and resolved after the spawns.

### 3. Recording tool

`tools/record-lessons.ts` (`pnpm lessons:record [id ...]`):

1. Starts the dev server (or uses `PRESTES_URL`), opens Chromium at
   640 x 360 with `recordVideo` at that size, the HUD hidden, the pixel post
   on, fonts loaded.
2. Starts a `lesson` battle on the map through a dev-only bridge call
   (`__prestes.startLesson(map)`), pauses, then for each tick to the end:
   applies the steps due, steps one tick, waits for the rendered tick.
   The cursor and highlights are drawn by a dev-only `LessonOverlay` in the
   view (a pixel cursor sprite, a click ripple, a ring, an arrow), not by
   the OS.
3. Records the frame hash at every step tick into
   `apps/game/public/lessons/<id>.hashes.json`; a second run compares.
4. Saves `<id>.webm`, a still `<id>.webp` (the frame at the script's
   `still` tick), and `<id>.<locale>.vtt` from `cues` and the locale
   catalog.
5. Checks the budget (≤ 45 s, ≤ 3 MB); over budget fails the run.

The recordings are committed. The content check verifies that every lesson
has its files and that the `.vtt` cue count matches the catalog.

### 4. Player

`LessonVideo` (new) wraps `PixelVideo` with a `<video>` element carrying
`<track kind="captions" srclang="pt-BR|en">`, controls (play/pause, replay)
as book-styled buttons with localized labels, muted by default, the active
locale's track `mode = 'showing'` and the other `hidden`. Captions are drawn
on the plate in the book's typeface from the track's active cues (not the
browser's default rendering). On `error` or `stalled` beyond 3 s: the still
and the cues' text as a paragraph. `ended` marks the lesson watched
(`prestes.lessons.v1`, a list of ids).

### 5. Book

- Marks: Campaign, Manual, Skirmish, Compendium, Options.
- Manual contents spread: lessons 1-5 left, 6-10 right, each a menu entry
  with number, title, map name and a tick.
- Lesson spread: left page title, map name, text paragraphs, "Experimentar"
  and "Sumário"; right page the plate. Corners and arrows turn lessons.
- Campaign page: "A campanha e o manual..." becomes "A campanha está em
  preparação. Aprenda o comando no Manual e lute numa escaramuça.", with
  two entries: Manual and Skirmish.
- "Experimentar": sets the battle map and opens the Skirmish spread;
  `returnTo = { mark: 'manual', lesson }` in session state so "Menu" from
  the battle end reopens the lesson.

### 6. The ten lessons (scripts in outline)

| # | Title (PT-BR) | Map | What the video shows | Length |
| --- | --- | --- | --- | --- |
| 1 | Selecionar e mover | Fazenda | click a section card; box-select; right-click a move on the pasture; the path drawn; a line move with drag and facing | 30 s |
| 2 | Postura e ocultação: o canavial | Fazenda | an enemy rifle section on the trench (hold fire); our section crouches and enters the cane; the ring turns green ("Oculto"); one man fires and is seen for 4 s | 40 s |
| 3 | Fogo apontado e supressão | Fazenda | attack order on a non-lethal enemy; aimed rhythm; suppress order; the enemy pins; the "?" of unseen fire is skipped (lesson 9) | 35 s |
| 4 | Cobertura e posições | Bairro | defend order at a corner; the slot markers along a quintal wall; the cover % in the HUD; a wall between shooter and target | 35 s |
| 5 | Lanços e flanco | Bairro | advance by bounds up a street (teams A and B alternate); a flank order around a block | 40 s |
| 6 | Defender e emboscar | Fazenda | defend on the trench line facing south; ambush in the corn holding fire until the enemy is close; the ambush opens | 40 s |
| 7 | Relevo e linha de visão | Serra e Rio | the preview's sight lines blocked by a crest; prone behind the fold; standing up is seen | 30 s |
| 8 | Travessias: vau, ponte e balsa | Serra e Rio | a section crosses the ford (slow, no prone); one the bridge; one the ferry in two trips | 45 s |
| 9 | Neblina de guerra e o "?" | Serra e Rio | fog on; an unseen enemy fires; the "?" marker near him, narrowing with more shots; a faded silhouette after contact | 35 s |
| 10 | Feridos, moral e retirada | Bairro | a soldier wounded; rescue order carries him to cover; a section pinned then withdrawing; regroup if a Comando exists | 40 s |

Captions: 4-8 cues per lesson, each ≤ 90 characters, in the voice of a
fictional tenente instructing ("Agache a seção antes de entrar no
canavial."). Texts on the left page repeat the essentials so the lesson is
complete without the video.

### 7. Training-ground removal

Delete `training-ground.ts` and its test, `TrainingLayer` and its export,
`TRAINING_TERRAIN`, the `trainingField` scene option, the
`training_phase` and `despawn_role` commands and the `UnitRole` type, and
`updateInstructorFollow`. Keep `training: true` with the training kit
(`map: 'training-kit'`) used by the simulation tests, the dummies, the
non-lethal flag and `TRAINING_AMMUNITION`. The engine's `map` option
shrinks to the training kit; its comment and the tests that used
`training-ground` move to the kit or to a battle map.

### 8. Historical method and figure roster

Lessons teach mechanics. A period remark (for example, that the column's
riflemen were short of cartridges) is labelled "nota histórica" and cites
`docs/history/WEAPONS.md` (Macaulay p. 113). The instructor in captions is
a fictional tenente; no historical figure appears.

## Risks / Trade-offs

- [Videos go stale as the game changes] → one command re-records all; the
  hashes file shows which lesson's simulation changed.
- [Repository size] → ≤ 3 MB per lesson, about 30 MB in all; the asset
  register records them; WebM VP9 at 640 x 360.
- [Headless rendering differs from a real GPU] → the tool records in headed
  Chromium when `--headed` is passed; the committed set is recorded headed
  on the developer machine.
- [Captions overflow the plate] → a 90-character cue limit checked by the
  content check.

## Migration Plan

`prestes.lessons.v1` is new. The bootcamp keys were already cleared by
`retire-bootcamp`. Removing the training ground changes no battle golden
(the battle maps and the Vila Militar field do not use it); the default
sandbox golden (`check-determinism` seed 1922, training kit) is unchanged.

## Open Questions

- Whether a short ambient sound bed suits the videos; deferrable (videos are
  muted by default and the tool can add audio later).
