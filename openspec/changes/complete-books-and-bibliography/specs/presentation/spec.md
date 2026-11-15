## ADDED Requirements

### Requirement: Plates inside chapters

A campaign chapter page MAY show an image plate from the compendium images in
addition to the chapter's opening plate, with at most one such page per
chapter. The plate SHALL be shown with its caption, credit and licence in the
player's language, above the page's paragraphs, and the page SHALL NOT be
split across spreads. The book SHALL fit such a page without overflow at
1440 x 900 and 1280 x 720 in PT-BR and EN.

#### Scenario: Chapter 8 shows the exile photograph

- **WHEN** the player reaches the chapter 8 page that carries the 1927 photograph of the revolutionary chiefs
- **THEN** the plate shows with its caption, the credit "Careta, 19 Mar. 1927" and its licence, and the paragraphs follow on the same page

#### Scenario: Plate page does not overflow

- **WHEN** the longest page with a plate is shown at 1280 x 720 in PT-BR
- **THEN** no text or image overflows the page

### Requirement: Bibliography in the compendium book

The compendium book SHALL end with a part titled "Fontes" in PT-BR and
"Sources" in EN. It SHALL list every row of the bibliography, sorted by short
form, with the full reference and the localized tier, rights and
consultation status, continuing across spreads as needed. The contents
spread SHALL list this part. In both books, every sources line SHALL show
short forms ("Macaulay 1974; Blanc 2024") instead of source keys, and
activating a short form SHALL open the compendium book, or bring it to the
front, at that source's row.

#### Scenario: Contents lists the sources

- **WHEN** the player opens the compendium book
- **THEN** the contents spread lists "Sources" (EN) or "Fontes" (PT-BR) after the sections

#### Scenario: Source line opens the bibliography

- **WHEN** the player activates "Rosa 1956" on chapter 6's sources line
- **THEN** the compendium book opens at the bibliography row for *Grande sertão: veredas*

#### Scenario: No raw keys in the books

- **WHEN** any chapter or entry is shown
- **THEN** no sources line shows a source key such as `macaulay-1974`
