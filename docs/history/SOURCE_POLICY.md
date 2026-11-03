# Historical Source Policy

This project uses a tiered source policy. A source's tier is its authority for a
specific kind of claim, not a claim that it is neutral or infallible.

## Tiers

1. **Tier 0 — Macaulay, *The Prestes Column* (1974).** Default authority for
   chronology, route, order of battle and military operations. When Macaulay
   conflicts with another source on a date, place or event, the game uses
   Macaulay's version as its baseline and records the divergence.
2. **Tier 1 — Amado, *O Cavaleiro da Esperança* (1942).** Authority for tone,
   narrative arc and the "Knight of Hope" myth. Not a factual authority.
3. **Tier 1 — Blanc, *The Prestes Column: An Interior History of Modern Brazil*
   (2024).** Authority for social and interior history: civilians, local
   politics, legitimacy, violence, memory. Not a chronology authority.
4. **Tier 2 — Primary memoirs.** Lourenço Moreira Lima, João Alberto Lins de
   Barros and Juarez Távora. Used for texture, route detail and lived experience.
   Contradictions are logged rather than silently resolved.
5. **Tier 3 — Academic and regional studies.** Anita Prestes, Hélio Silva,
   Domingos Meirelles, Eliane Brum, Maria Clara Spada de Castro, regional theses
   and local studies. Used for detail, counterpoint and regional nuance.
6. **Tier 4 — Finding aids.** Portal Anticolonialismo / Memorial Virtual Coluna
   Prestes and similar bibliographic portals. Used to discover sources; never
   cited as authority for a claim.

## Rules

- Every historical claim in campaign content must carry a `sourceRef`.
- Every chapter keeps a source matrix with at least two independent sources.
- Conflicts are recorded in `docs/history/TIMELINE.md`; the codex may present the
  alternatives without presenting one as certain.
- No verbatim reproduction of copyrighted books. Notes are paraphrases with
  chapter/page citations; short quotations only when necessary.
- Consultation status is explicit: `full`, `partial` or `citation-only`.
- DRM is never bypassed. DRM-protected files are not ingested; use a legal
  DRM-free copy or user-provided notes.
- Book scans, OCR text and extracted map images live under `livros/`, which is
  gitignored, and are never committed or redistributed.
- Extracted maps are reference material only. Game maps are original low-poly
  recreations.

## Current status

- Macaulay: DRM-free local copy, text layer extracted, Tier 0.
- Blanc: local copy, Tier 1 social history.
- Amado: citation-only, Tier 1 tone.
- Portal Anticolonialismo: finding aid, Tier 4.
