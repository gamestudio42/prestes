---
id: ''
status: idea
commanderId: '' # playable figure id from docs/history/FIGURES.md
perspective: ''
historicalDate: ''
label: '' # historical | dramatized | fictional
sourceRefs: [] # source keys from docs/history/SOURCES.md
---

# <Order> - <Title>

The front matter mirrors the `MissionMetadata` contract in
`packages/content/src/figures.ts`.

## Pitch

One paragraph: the situation, the choice and what the player will remember.

## Historical frame

What happened, in two or three sentences.

### Sources

| Role       | Source key | Reference | Confidence |
| ---------- | ---------- | --------- | ---------- |
| Chronology |            |           |            |
| Context    |            |           |            |
| Tone       |            |           |            |

### Historical, dramatized, fictional

- **Historical:** events and figures that are documented.
- **Dramatized:** compressed time, invented dialogue, composite terrain.
- **Fictional:** characters or episodes created for the game.
- **Legend versus record:** when the popular memory and the source differ,
  state both and keep them readable.

## Perspective

Who commands, why this figure and not another, and what the player knows that
the figure did not.

## Player fantasy and pillar

- **Fantasy:** one sentence.
- **Pillar:** which of the four campaign pillars this mission proves.
- **Loop beat:** the beat of the core loop the mission changes.

## Objectives

### Primary

- ...

### Optional

- ...

### Failure

- ...

A certain-defeat mission still needs objectives. They measure delay,
withdrawal and casualties, not survival.

## Map and terrain

- Place, scale, bounds and time of day.
- Cover, buildings, water, height and chokepoints.
- What the map teaches before the first shot.

## Forces

| Side   | Sections | Soldiers | Weapons | Notes |
| ------ | -------- | -------- | ------- | ----- |
| Player |          |          |         |       |
| Enemy  |          |          |         |       |

State the player's section count and sizes. A mission may use four groups
(two of five, two of four) or another structure; do not hide it in prose.

## Mechanics

### Existing

- ...

### Requires new capability

- ... (name the capability and mark it as not implemented)

## Beats

### Briefing

...

### Opening

...

### Mid-mission

...

### Climax

...

### Debrief

...

## Texts

- Campaign book chapter: [`../book/<order>-<slug>.md`](../book/)
- Compendium entries: [`../compendium/README.md`](../compendium/README.md)
- Image placeholders: [`../compendium/images.md`](../compendium/images.md)

## Script

| Key                           | EN (source) | PT-BR |
| ----------------------------- | ----------- | ----- |
| `campaign.<mission>.briefing` |             |       |
| `campaign.<mission>.opening`  |             |       |
| `campaign.<mission>.mid`      |             |       |
| `campaign.<mission>.climax`   |             |       |
| `campaign.<mission>.success`  |             |       |
| `campaign.<mission>.failure`  |             |       |

A certain-defeat mission replaces `success` with `last-stand` and adds
`defeat` and `epilogue`.

## Codex unlocks

- Figure:
- Place:
- Event:
- Weapon:

## Victory and defeat

- **Victory:** what the player sees and keeps.
- **Defeat:** what the player sees, what is attributable and what is retried.

For a certain-defeat mission, replace victory with the measure the player can
influence (time held, delay, casualties) and the scripted outcome. State
whether the debrief separates the legend from the record.

## Out of scope

- ...

## Open questions

- ...
