# Prestes - Campaign

> **Status:** `draft`. The campaign is not implemented. This document is design
> intent, not a spec.

## Pitch

_Prestes_ is a tactical RTS about a column that cannot win a pitched battle and
cannot stop moving. The player commands sections through the risings and the
march of the Coluna Prestes (1922-1927), under the historical figure who was
actually there. Prestes is the narrative spine, not a superhero: the game is
about position, fire, morale, supply and the cost of staying alive long enough
to keep the column political.

## Player fantasy

You are the officer the men actually have: you read the ground, give a handful
of orders, and try to bring the same men out of the next fight. History is
larger than you; your job is the next hundred meters.

## Pillars

1. **Command the section, not the hero.** Outcomes come from orders, position,
   fire and morale, not from a scripted hero moment. The historical commander
   is present; the soldiers do the work.
2. **Read the ground before the fight.** Cover, line of sight, height and fog
   decide more than raw numbers. The player wins by seeing the field before the
   enemy does.
3. **The march costs more than the battle.** Fatigue, ammunition, wounds,
   rescue and recovery make a victory expensive. A section that survives is
   worth more than a position that is held.
4. **History with receipts.** Every mission is sourced, labeled and
   multi-perspective. The game does not worship its figures and does not invent
   facts to fill a gap.

## Narrative commitments

- **Multi-perspective:** each mission is commanded by the historical figure who
  was actually present. Prestes is the spine, not the only playable voice.
- **Prestes is the absent spine.** The prologue is Siqueira Campos's; the
  column is Prestes's. His typhoid in July 1922 is part of the arc, not a
  footnote.
- **Miguel Costa stays visible.** He was the formal commander of the First
  Revolutionary Division; the campaign must not reduce the column to one man.
- **Civilians and the interior.** The column's legitimacy is shown through
  people, local decisions and consequences, not through a political meter
  (Blanc).
- **Tone from Amado, chronology from Macaulay.** Amado supplies myth and tone,
  never facts; no text is reproduced.
- **Labels:** every mission declares `historical`, `dramatized` or `fictional`
  content. The codex records alternatives instead of pretending there is one
  neutral account.

## Core loop

| Beat        | Player action                                                 | What the player reads                    |
| ----------- | ------------------------------------------------------------- | ---------------------------------------- |
| **Read**    | Pan, zoom, hover, scout                                       | Fog, `?` markers, cover, height, contact |
| **Command** | Select, move, advance, attack, suppress, flank, defend, recon | Paths, previews, callouts, order rings   |
| **Sustain** | Rescue, regroup, resupply, rest                               | Wounds, fatigue, ammunition, morale      |
| **Decide**  | Hold, press, withdraw, retry                                  | Objectives, casualties, mission result   |

The mission loop is: **briefing -> deployment -> contact -> objective ->
debrief -> progression.** A mission is not done when the shooting stops; it is
done when the player can say what it cost and why.

## Act structure

### Act I - The risings (1922-1924)

Mission 01 is the prologue: the Forte de Copacabana, the beach and the 18. The
revolt fails without Prestes, who is absent with typhoid. The July 1924 São
Paulo revolt is a separate front. The Rio Grande do Sul rising of October 1924
opens the southern war.

### Act II - The Iron Ring (1924-1925)

The column begins here, in mission 02, in the south. Government forces converge
on the southern rebels. The column escapes the encirclement, fights at Ramada
and crosses the Uruguay River. This act is the breakout, not the long march.

### Act III - The Column (1925-1926)

The southern and São Paulo rebels combine in western Paraná; Prestes and Miguel
Costa meet at Benjamin Constant on 3 April 1925, the First Revolutionary Division
forms at Porto Santa Helena on 14 April, and the crossing runs from Porto Mendes
to Puerto Adela. Foz do Iguaçu is Isidoro’s political headquarters. The column
re-enters Brazil and marches north through the interior, fighting rearguard
actions in Goiás and Minas Gerais and living off the land.

### Act IV - Exile (1927)

The column crosses the Pantanal. The main body enters Bolivia at San Matias on 3
February 1927; Siqueira’s group enters Paraguay in March. The march dissolves
into exile. The campaign ends with memory, not victory.

## Mission list

| #   | ID                     | Title                                                      | Date and place                                                                  | Commander              | Teaches                                                                      | Status  |
| --- | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- | ------- |
| 01  | `prologue-18-do-forte` | [Os Dezoito do Forte](missions/01-prologue-18-do-forte.md) | 1922-07-05/06 - Copacabana beach, Rio de Janeiro                                | Siqueira Campos        | The 18 up the Avenida Atlântica; fire discipline; delaying action; certain defeat | `draft` |
| 02  | `anel-de-ferro`        | [O Anel de Ferro](missions/02-anel-de-ferro.md)            | 1924-10 to 1925-01 - Santo Ângelo, São Borja, Uruguaiana; Ramada; Uruguay River | Luís Carlos Prestes    | Breakout from encirclement; march and rear guard; river crossing             | `draft` |
| 03  | `a-divisao`            | [A Divisão](missions/03-a-divisao.md)                      | 1925-04 - Benjamin Constant, Porto Santa Helena, Porto Mendes to Puerto Adela   | Miguel Costa           | Joining forces; command structure; river crossing under pressure             | `draft` |
| 04  | `frente-do-parana`     | [A Frente do Paraná](missions/04-frente-do-parana.md)      | 1924-1925 - Catanduvas and the Paraná plateau                                   | Isidoro Dias Lopes     | Catanduvas trenches, artillery pressure, fighting withdrawal                 | `draft` |
| 05  | `ponte-de-verdinho`    | [A Ponte de Verdinho](missions/05-ponte-de-verdinho.md)    | 1925-06-27/28 - Mineiros, Goiás                                                 | Luís Carlos Prestes    | Rear guard, bridge denial, ford crossing, pursuit                            | `draft` |
| 06  | `serra-nova`           | [Serra Nova](missions/06-serra-nova.md)                    | 1926-04-22/26 - Serra Nova and Taiobeiras, Minas Gerais                         | Luís Carlos Prestes    | Rearguard ambush; break contact; encirclement escape                         | `draft` |
| 07  | `pantanal`             | [O Pantanal](missions/07-pantanal.md)                      | 1927-01/03 - Pantanal; Bolivia and Paraguay                                     | Luís Carlos Prestes    | Attrition, survival, crossing; the exile split                               | `draft` |
| 08  | `la-gaiba`             | [La Gaiba](missions/08-la-gaiba.md)                        | 1927-07-05 - La Gaiba, Bolivia                                                  | Prestes and the exiles | Aftermath, memory, non-combat epilogue                                       | `draft` |

Mission 01 is the prologue. The column begins in mission 02, in the south. The
prologue's legendary 18 are destroyed as a fighting force; the historical record
has survivors, and they do not carry into the column.

Mission 04, "A Frente do Paraná", is a flashback or parallel front dated
1924-1925; mission 05 follows mission 03 chronologically. Isidoro Dias Lopes
commands from Foz do Iguaçu; Estilac Leal’s brigade holds Catanduvas, so the
mission’s tactical section is fictional and the command voice is Isidoro’s.
Mission 05 uses Prestes as the command voice; Cordeiro commanded the rearguard
detachment at the Verdinho bridge.

A row with `pending` cannot move to `locked`. Name a figure already registered
in [`docs/history/FIGURES.md`](../history/FIGURES.md), or add the figure
through the proper source and registry work first. Do not invent a commander to
fill the row. Miguel Costa and Isidoro Dias Lopes are in `FIGURES.md` and in the runtime
registry with `playable: false`.

The campaign book reads its chapters from
`packages/content/src/campaign/chapters.ts` and
`packages/content/src/campaign/text/{en,pt-BR}.ts`, imported from `book/` and
the missions' `Player text` sections. Edit the doc and the runtime text
together.

## Out of scope

- Campaign progression code, save/load and between-mission UI.
- Cavalry, artillery, aircraft, direct control and multiplayer.
- Final art, audio, maps and character meshes.
- A legitimacy, supply or political economy until it has a source, a sink and a
  player verb.
- Playable missions for the July 1924 São Paulo front until a source and a
  commander are registered.
- Additional languages beyond PT-BR and EN.

## Tone and sources

- **Macaulay, _The Prestes Column_ (1974)** is Tier 0 for chronology, route and
  military operations.
- **Amado, _O Cavaleiro da Esperança_** is Tier 1 for tone and arc, not facts.
  The campaign book is original prose in that register; no text is reproduced.
- **Blanc (2024)** is Tier 1 for social and interior history; ch. 7 and fig. 7.5
  are the authority for the La Gaiba monument and inscription.
- **Cohen (2007)** is Tier 3 for the July 1924 bombardment and the districts hit.
- **Nascimento (2026)** is Tier 3 for the Serra Nova encirclement and the “laço
  húngaro”; the ALMG note is a Tier 4 finding aid.
- **Regional studies** are Tier 3. **CPDOC/FGV** and **Portal Anticolonialismo /
  Memorial Virtual Coluna Prestes** are finding aids, not page-level authorities.
- At least two independent sources per mission. Record contradictions in
  [`docs/history/TIMELINE.md`](../history/TIMELINE.md); never resolve them
  silently.
- Page-level source status lives in
  [`docs/history/CHAPTER_SOURCES.md`](../history/CHAPTER_SOURCES.md).

## Campaign book and compendium

- [`book/`](book/) holds the player-facing, dramatized chapters. English is the
  source language; PT-BR is the translation. The prose is original.
- [`compendium/`](compendium/) holds the historical entries: the short in-game
  text, the extended note and the source line.
- [`compendium/images.md`](compendium/images.md) is the manifest of image,
  historical-photo and illustration placeholders.
- The compendium drafts are not runtime content yet. Apply them to
  `packages/content/src/locales/{en,pt-BR}.ts` only in the campaign change.

## Legal and ethical note

The game is an original work inspired by Jorge Amado's _O Cavaleiro da
Esperança_ and by historiography. It does not reproduce book text, and a direct
adaptation would require permission from the rights holders. Historical claims
are traceable to [`docs/history/SOURCES.md`](../history/SOURCES.md). Book scans
and OCR text stay under `livros/`, are gitignored and are never redistributed.
DRM is never bypassed. The game presents multiple perspectives and does not
hero-worship its figures.

## Open decisions

See [`open-questions.md`](open-questions.md) for historical gaps, figure
approvals, mechanics that need a new capability, progression and localization
questions.
