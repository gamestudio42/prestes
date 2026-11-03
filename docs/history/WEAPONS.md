# Weapons of the Prestes Column

This is a working reference for the sandbox, not a ballistic manual. It separates
what the cited history supports from what the game abstracts. The game must not
present an inferred model, calibre detail or statistic as a documented fact.

## Scope and source policy

- Chronology, organisation and operations follow Neill Macaulay, *The Prestes
  Column: Revolution in Brazil* (1974), Tier 0.
- Other sources may be added only under `SOURCE_POLICY.md`; book scans under
  `livros/` are not redistributed.
- Names of weapons are kept in Portuguese in game strings where appropriate.
- Page references below are printed book pages, not PDF pages.

## Summary

| Weapon or equipment | Historical context | Evidence | Game status |
| --- | --- | --- | --- |
| Fuzil Mauser 7 mm | Brazil's standard military rifle and the main arm of the revolutionary troops. The source does **not** name the model. | Macaulay, p. 113 | Documented identity; abstracted statistics |
| Metralhadoras 7 mm | The column had four 7 mm machine guns. | Macaulay, p. 113 | Future weapon; not equipable in this slice |
| Fuzis automáticos 7 mm | About four serviceable automatic rifles of the same calibre. | Macaulay, p. 113 | Future weapon; not equipable in this slice |
| Winchester .44 | Civilian hunting rifle used by landowners and irregulars; .44 ammunition was common in the backlands when 7 mm military ammunition was scarce. | Macaulay, p. 152 | Future weapon; historical reference only |
| Revólveres, carabinas, pistolas e lanças | Irregular gaucho forces carried a mixture; only about one thousand of three thousand men were well armed, while a regular contingent of about two hundred had Mauser rifles. | Macaulay, p. 54 | Future equipment; not implemented |
| Canhão 75 mm | A battery of three 75 mm field guns crossed the Paraná with the division in April 1925. | Macaulay, p. 93 | Future artillery; not implemented |
| Obus 105 mm | Government artillery used against the Catanduvas stronghold. | Macaulay, p. 85 | Future artillery; not implemented |
| 20 mil cartuchos | The column had about twenty thousand cartridges for its rifles, machine guns and automatic rifles, roughly sixteen per man before other stocks are counted. | Macaulay, p. 113 | Design constraint: ammunition scarcity |

## The column at the start of the march

Macaulay describes a force of no more than twelve hundred men. Most carried the
standard 7 mm Mauser. The column had four 7 mm machine guns and about the same
number of serviceable automatic rifles. For all of these weapons there were only
about twenty thousand cartridges. It had no artillery, no mortars and no grenades
at that point (p. 113).

This is the basis for the sandbox's basic rifle, limited ammunition and emphasis
on fire discipline. It is not a claim that every soldier carried the same number
of rounds or that the column never captured other weapons.

## Irregular forces and the interior

At the Ibirocaí camp, Macaulay records about three thousand men and five thousand
horses. Only about one thousand were well armed; the rest carried revolvers,
Winchester rifles, lances and older weapons. A regular contingent of about two
hundred men under Major Távora had Mauser rifles and marksmanship training
(p. 54).

In Goiás, Winchester hunting rifles in the hands of property owners took a toll on
rebel foragers. The column's foragers seized Winchesters partly because their own
Mauser ammunition was running out. The source notes that 7 mm military ammunition
was rare in the backlands while .44-calibre Winchester cartridges were available
almost everywhere (p. 152).

## Artillery

The column was not originally an artillery force. At Catanduvas the government
used 105 mm howitzers; the surrendered material included a 105 mm howitzer, two
75 mm guns, 398 rifles and machine guns, and more than ten thousand cartridges
(p. 85). In April 1925 a battery of three 75 mm field guns crossed the Paraná with
the division (p. 93). Artillery belongs to a later sandbox slice and must not be
implied in the opening rifle skirmish.

## Game abstraction: Mauser 7 mm

The first equipable weapon is the **Fuzil Mauser 7 mm**. The source supports the
7 mm Mauser identity and its role as the standard rifle; it does not support a
specific model designation.

The following are game abstractions for the sandbox:

| Field | Value | Note |
| --- | --- | --- |
| Magazine | 5 rounds | Chosen for a five-round bolt-action clip; not stated by Macaulay |
| Reserve | 15 rounds | Gives 20 rounds at deployment, close to the roughly sixteen per man implied at p. 113 |
| Fire interval | 12 ticks | 1.2 s at the 10 Hz simulation tick; playability abstraction |
| Reload | 30 ticks | 3 s; playability abstraction |
| Range | 26 m | Sandbox scale, not a historical maximum |
| Accuracy | 0.75 | Base value before range, cover and morale modifiers |
| Damage | 18–30 | Playability abstraction |
| Suppression | 1.0 | Baseline; future automatic weapons may exceed it |

No model number, muzzle velocity, sight setting or exact rate of fire should be
added to player-facing text unless a source supports it.

## Future weapons

Do not add these to the equipable catalog until their mechanics are tested:

- Winchester .44 — civilian/irregular lever rifle with different ammunition.
- 7 mm machine gun — sustained fire and high suppression.
- 7 mm automatic rifle — intermediate suppression and ammunition use.
- 75 mm field gun — artillery, indirect fire and crew.
- 105 mm howitzer — government artillery, later scenario.

## References

- `macaulay-1974`: Neill Macaulay, *The Prestes Column: Revolution in Brazil*
  (New York: New Viewpoints / Franklin Watts, 1974), pp. 54, 85, 93, 113, 152.
- `SOURCE_POLICY.md`: source tiers and research rules.
- `SOURCES.md`: bibliography and consultation status.
