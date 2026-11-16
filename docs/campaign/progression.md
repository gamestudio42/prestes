# Progression

> **Status (2026-11-15):** partly implemented by `make-campaign-playable`.
> In the game: chapters played in order from the campaign book, a chapter
> opened by **winning** the one before it, results kept in the browser
> (`prestes.campaign.v1`: won, plays, last and best result), the debrief's
> "Next chapter", "Play again" and "Back to the book", and "Restart
> campaign". Still design intent: soldiers carried between chapters, the
> interlude and roster steps, and save/load of a battle (see
> [`docs/status.md`](../status.md)).

## Chain

Missions unlock in order: a chapter opens once the chapter before it has
ended in victory (the owner's choice of 2026-11-15, "precisa vencer"); a
defeat or a draw does not open it, and a later defeat never locks a chapter
again. A chapter is replayable from its debrief and from the book. Campaign
state is the list of chapter results (implemented); the roster is not kept
yet, so each chapter fields its map's own force.

## Prologue and column

Mission 01 is a prologue. Its 18 soldiers are destroyed; nothing carries into
the column. Mission 02 begins the column in the south with a new roster and
Prestes. The prologue unlocks the codex and the campaign narrative; it is a
gate, not a roster bridge.

## What carries between missions

**Not in this change:** `make-campaign-playable` keeps each chapter
self-contained (the owner's choice of 2026-11-15); nothing in the table below
carries yet. It is the intent for a later change.

The table applies to missions 02 onward. Mission 01 is the exception.

| Element             | Carries? | Notes                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------- |
| Soldier identity    | Yes (not in this change) | Same id, name and role across missions.                               |
| Wounds and recovery | Yes (not in this change) | The simulation already preserves a soldier id and remaining recovery. |
| Dead and missing    | Yes (not in this change) | A dead soldier does not return. Missing is an open question.          |
| Ammunition          | TBD      | Campaign load is not decided. Training uses 5 + 45; sandbox 5 + 15.   |
| Fatigue             | No       | Reset at the start of a mission.                                      |
| Morale              | No       | Reset at the start of a mission.                                      |
| Equipment           | TBD      | Depends on a future roster system.                                    |

## Between missions

1. **Debrief:** result, time, dead, wounded, routed and objectives
   (implemented, with the map's epilogue and the campaign actions).
2. **Interlude:** the commander's account, sourced and labeled.
3. **Roster:** replacements, recovery and the next mission's force.
4. **Unlocks:** codex entries and, later, mission availability.
5. **Deployment:** pre-battle roster and map.

## Failure and retry

- Mission 01 has no victory. A retry improves the delay measure; it does not
  change the historical outcome.
- A failed mission can be retried from its deployment.
- A retry does not erase codex unlocks.
- Whether a retry rewinds casualties in the column is an open question. The
  prologue's dead do not carry into mission 02.

## Save and load

- Deferred. The persistence contract is an open question. The kept campaign
  results are not save/load: a battle left half-way is not kept.
- Campaign state must be deterministic and versioned before save/load ships.

## What this file does not decide

- A legitimacy, supply or political resource. It needs a source, a sink and a
  player verb before it enters the game.
- Difficulty scaling. Change one variable at a time and record it.
- Mission length. It is an open question, not a hidden target.
