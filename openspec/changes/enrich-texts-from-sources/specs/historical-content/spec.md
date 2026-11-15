## ADDED Requirements

### Requirement: Quotations and source rights

Every source in the register SHALL declare its rights, using one of these
values:

- `public-domain`;
- `free-licence`, naming the licence;
- `copyrighted`;
- `unknown`.

Player-facing text MAY quote a source verbatim only when that source is
`public-domain` or `free-licence`. A quotation SHALL be shown as a
quotation, with an attribution that names the author or signatories and the
date. A quotation SHALL resolve to a registered source key and a citation.
Text drawn from a `copyrighted` or `unknown` source SHALL be paraphrased,
with a page or chapter citation. The content check SHALL fail when a
quotation names a source whose rights are not `public-domain` or
`free-licence`, or names an unknown source key. A quotation SHALL have the
same wording in both locales: the PT-BR text is the original, and the EN
text is marked as a translation. The rights of the sources this change adds
are recorded in the source register:

- `manifesto-1925`: `free-licence`, GNU FDL, marxists.org transcription.
- `lima-1931`: `public-domain`; Lourenço Moreira Lima died in 1940.
- `rosa-1956`: `copyrighted`.
- `mozzer-2009`: `copyrighted`.

#### Scenario: Manifesto may be quoted

- **WHEN** a compendium note quotes the Manifesto of Porto Nacional with source `manifesto-1925`
- **THEN** the content check passes and the reading page shows the quotation attributed to Miguel Costa, Luís Carlos Prestes and Juarez Távora, Porto Nacional, 19 October 1925

#### Scenario: Copyrighted source may not be quoted

- **WHEN** a quotation names source `rosa-1956`
- **THEN** the content check fails and names the entry and the source

#### Scenario: Unknown source key in a quotation

- **WHEN** a quotation names a source key absent from the register
- **THEN** the content check fails and names the key

#### Scenario: EN quotation is a marked translation

- **WHEN** the player reads the manifesto quotation in EN
- **THEN** the text is an English translation and is marked as translated from the Portuguese

### Requirement: The column's own documents and its literary memory

The compendium SHALL contain the following entries. Each SHALL have a label,
sources, a confidence level, and a title, body and extended note in PT-BR
and EN:

- `manifesto-porto-nacional-1925`: an event dated `1925-10-19`, labelled
  `historical`.
  - Sources: `manifesto-1925` and `macaulay-1974`.
  - It states that the column issued the manifesto on the Tocantins after
    some fifteen months of fighting.
  - It states what the manifesto asks for: a return to the liberal
    principles of the Constitution, and a peace grounded in justice rather
    than surrender.
  - It quotes the manifesto.
- `porto-nacional`: a place in northern Goiás (1920s borders), labelled
  `historical`, linked to the manifesto event.
- `o-libertador-1924`: an event, labelled `historical`.
  - Sources: `libertador-1924`, `anita-1991` and `historiafm-2024`.
  - It states that the first issues came out in São Luiz Gonzaga at the end
    of 1924, and that later issues were printed along the march.
  - It states that the sources give nine or ten issues in total. It
    presents both counts and does not pick one.
- `lourenco-moreira-lima`: a figure, labelled `historical`, not playable.
  - Sources: `lima-1931` and `mozzer-2009`.
  - It describes him as a lawyer and captain who served as the column's
    secretary, an editor of *O Libertador* and the author of *Marchas e
    combates*.
  - It gives the nickname "Bacharel Feroz".
  - It quotes his farewell to the dead buried at La Gaiba.
- `batalhoes-patrioticos-bahia`: a force, labelled `historical`.
  - Sources: `anita-1991` and `mozzer-2009`, the latter citing Eul-Soo Pang.
  - It gives the battalions raised in Bahia in early 1926 and their sizes
    as Anita Prestes reports them (Horácio de Matos about 1,500, Franklin
    Lins de Albuquerque about 800, Abílio Wolney about 1,000), with
    confidence `medium`.
- `coluna-no-grande-sertao`: an event, labelled `dramatized`.
  - Sources: `mozzer-2009` and `rosa-1956`.
  - It paraphrases Riobaldo's memory of the "soldados de Prestes" passing
    from Goiás and of the fighting at the mouth of the Urucuia.
  - It names the rivers the novel shares with the column's route.
  - It presents the link between the novel and the column as one critic's
    interpretation, not as established fact.
  - It contains no quotation from Rosa or Mozzer.
- `vivandeiras`: a force, labelled `historical`.
  - Sources: `historiafm-2024`, `mozzer-2009` (citing Veiga 1992) and
    `carvalho-2001`.
  - It gives about fifty women: about thirty from the Rio Grande do Sul and
    about twenty with the São Paulo troops.
  - It tells how they crossed the Uruguay river against the order not to
    cross, and stayed.
  - It names their work: fighting, carrying the wounded, gathering
    information.
  - It names the women known by nickname (Santa Rosa, Tia Maria) and
    Hermínia, the Austrian nurse.
  - It states that Moreira Lima's account reduced their role, and that most
    of their names are lost.
  - Confidence: `medium`.
- `tenentismo`: an event dated `1922-07-05`, labelled `historical`.
  - Sources: `macaulay-1974` (ch. I, pp. 4–5), `historiafm-2024` and
    `anita-1991`.
  - It states that the movement was of junior officers while the high
    command stayed loyal.
  - It states the officers' grievance against the Minas–São Paulo
    arrangement that made Bernardes president, and the forged letters of
    1921.
  - It gives the liberal aims the movement came to adopt: the secret
    ballot, political morality, education.
  - It presents the three historians' explanations as alternatives, not as
    a verdict: urban middle class, military institution, a combination of
    both.
  - It ends with Prestes's break with the tenentes in 1930.
  - Confidence: `high`.
- `positivismo-militar`: an event dated `1889-11-15`, labelled
  `historical`.
  - Sources: `macaulay-1974` (ch. II, pp. 33–34; ch. III, pp. 64–66) and
    `historiafm-2024`.
  - It states that Benjamin Constant taught Comte's positivism at the
    Military Academy, and that the cadets took part in abolition and the
    1889 coup.
  - It states that the flag carries the positivist motto "Ordem e
    Progresso".
  - It states that Prestes's father was a positivist cadet of that
    generation.
  - It states that the doctrine rejected revolution, and that Cândido
    Rondon, an orthodox positivist, commanded government forces against the
    rebels in Paraná.
  - It does not present positivism as the rebels' programme.
  - Confidence: `high`.

The `army-coluna` extended note SHALL add these points, each with its
source:

- requisitions, with written notes, and the harm a requisition did to poor
  families;
- that the command punished abuses, and that government troops also
  looted;
- the burning of tax registers and the freeing of prisoners held in iron
  collars and stocks (`historiafm-2024`, `mozzer-2009` citing Anita
  Prestes);
- a strength that never exceeded about 1,500 against rumours of ten
  thousand;
- that a large share of the rank and file was Black, which period labels
  such as "caboclos" hid, and that there is no count. It SHALL NOT give a
  number the sources do not give.

The source register SHALL list `historiafm-2024` (Tier 3, consulted in full
through an automatic transcript, `copyrighted`).

The source register SHALL list `superoitocine-2012` (the documentary "Coluna
Prestes | DOC") with consultation status "not consulted". No player-facing
text SHALL cite it until it has been reviewed and its status changed.

Luís Carlos Prestes's extended note SHALL say that the march is remembered
as "a maior marcha revolucionária do mundo" in PT-BR ("the greatest
revolutionary march in the world" in EN). It SHALL present this as how the
march is remembered, not as a measured record. It SHALL keep the distance
and states already given and the divergence on the number of states.

The timeline SHALL record these divergences:

- *O Libertador*: nine against ten issues;
- *O Libertador*: the first issue dated November 1924 against December
  1924;
- the march: thirteen against fifteen states;
- the column's start: São Luiz Gonzaga on 27 December 1924 against the
  union in Paraná in April 1925. Macaulay remains the baseline.

Source notes: the manifesto text is from the marxists.org transcription
(GNU FDL). The battalion sizes, the vivandeiras and the La Gaiba eulogy are
taken from Mozzer 2009, pp. 252–257, which cites Anita Prestes 1991
(p. 262), Veiga 1992 and Lima 1979 (p. 523). The issue counts of *O
Libertador* are from Anita Prestes (Brasil de Fato interview, 7 Sep. 2024)
and the Brasil Cultura caption (2009), both recorded as finding-level
evidence.

#### Scenario: New entries are present and sourced

- **WHEN** the compendium registry is read
- **THEN** it contains the nine entries above, each with a label, at least one registered source, a confidence level and text in both locales

#### Scenario: Positivism's irony is kept

- **WHEN** the player reads `positivismo-militar`
- **THEN** the note says that the doctrine rejected revolution, and that Rondon, an orthodox positivist, fought the rebels, citing Macaulay ch. III

#### Scenario: Tenentismo's explanations are alternatives

- **WHEN** the player reads `tenentismo`
- **THEN** the three historians' explanations are presented side by side, and none is stated as the answer

#### Scenario: The column's conduct is shown with its costs

- **WHEN** the player reads the `army-coluna` extended note
- **THEN** it states that requisitions hurt poor families and that abuses were punished, beside the burning of tax registers and the freeing of prisoners, and it gives no count of Black soldiers

#### Scenario: The literary entry is labelled and paraphrased

- **WHEN** the player opens `coluna-no-grande-sertao`
- **THEN** the page shows the "dramatized" label, the text presents the link as an interpretation, and no passage is quoted from Rosa or Mozzer

#### Scenario: The issue count is shown as a divergence

- **WHEN** the player reads `o-libertador-1924`
- **THEN** the note gives both nine and ten issues and names where each count comes from

#### Scenario: The documentary is not cited

- **WHEN** the content check runs while `superoitocine-2012` is "not consulted"
- **THEN** no compendium entry or chapter lists it among its sources, and the check fails if one does

#### Scenario: The motto is framed as memory

- **WHEN** the player reads Luís Carlos Prestes's extended note in PT-BR
- **THEN** it contains "a maior marcha revolucionária do mundo" introduced as how the march is remembered, beside the 25,000 km and thirteen states

## MODIFIED Requirements

### Requirement: Campaign chapter registry

The project SHALL provide a machine-readable campaign registry of the prologue
and chapters 2 to 8, in campaign order. Each chapter SHALL declare:

- an id and a number;
- a localized title;
- a date and a place;
- a commander that resolves to the figure registry;
- a localized perspective;
- one label: historical, dramatized or fictional;
- at least one source reference;
- an optional image reference from the compendium images;
- bilingual prose split into pages;
- a bilingual briefing (pitch and objectives summary);
- the compendium entries it links to;
- a playable flag.

The playable flag SHALL be false for every chapter until its mission exists.
Commanders SHALL follow `docs/campaign/CAMPAIGN.md`:

- Siqueira Campos for the prologue.
- Luís Carlos Prestes for chapters 2, 5, 6 and 7.
- Miguel Costa for chapter 3.
- Isidoro Dias Lopes for chapter 4.
- Luís Carlos Prestes for chapter 8, with the exiles as the perspective.

Chapter dates and places SHALL match `docs/history/TIMELINE.md`. Validation SHALL
fail on an unknown commander, an unknown source, an unknown compendium link,
missing text in either locale, or a playable chapter without a mission.

Chapter prose MAY contain attributed quotations under the quotation rule.
Chapter 6 (Serra Nova) SHALL have these additions:

- It opens with a page set at Porto Nacional in October 1925. The page
  bridges June 1925 to April 1926 and quotes the manifesto.
- It ends with the memory of the column at the mouth of the Urucuia, as a
  paraphrase.
- It lists `manifesto-1925` and `mozzer-2009` among its sources.
- It links to `manifesto-porto-nacional-1925`,
  `batalhoes-patrioticos-bahia` and `coluna-no-grande-sertao`.

Chapter 8 (La Gaiba) SHALL have these additions:

- It contains Moreira Lima's farewell to the dead as an attributed
  quotation.
- It lists `lima-1931` among its sources.
- It links to `lourenco-moreira-lima`.

The prologue SHALL link to `tenentismo`. Chapter 4 (Frente do Paraná) SHALL
link to `positivismo-militar`.

The chapter date and date range of chapter 6 SHALL stay `1926-04-22` to
`1926-04-26`. The Porto Nacional page is a retrospective opening, and the
chapter's date does not move.

#### Scenario: Registry order and commanders

- **WHEN** the campaign registry is read
- **THEN** it lists the prologue and chapters 2 to 8 in order, and chapter 3's commander is `miguel-costa`

#### Scenario: No playable chapter yet

- **WHEN** the campaign registry is validated
- **THEN** every chapter's playable flag is false

#### Scenario: Unknown link fails

- **WHEN** a chapter links to a compendium id that does not exist
- **THEN** the content check fails and names the chapter and the id

#### Scenario: Prose is original and labelled

- **WHEN** a chapter's prose is shown
- **THEN** its label is shown with it, the text is the project's own dramatization apart from attributed quotations of public-domain or free-licence sources, and sources are listed on the briefing spread

#### Scenario: Chapter 6 opens at Porto Nacional

- **WHEN** the player opens chapter 6
- **THEN** the first prose page is headed with Porto Nacional, October 1925, and quotes the manifesto with its attribution, and the chapter date still reads April 1926

#### Scenario: Chapter 8 carries the eulogy

- **WHEN** the player reads chapter 8
- **THEN** one page shows Moreira Lima's farewell to the dead of La Gaiba as a quotation attributed to him, and the briefing links to his compendium entry
