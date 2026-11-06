# Progression

> **Status:** design intent. Nothing here is implemented. Campaign progression
> and save/load are deferred in [`docs/status.md`](../status.md).

## Chain

Missions unlock in order. A mission is replayable from its debrief. Campaign
state is the list of mission results plus the roster.

## Prologue and column

Mission 01 is a prologue. Its 18 soldiers are destroyed; nothing carries into
the column. Mission 02 begins the column in the south with a new roster and
Prestes. The prologue unlocks the codex and the campaign narrative; it is a
gate, not a roster bridge.

## What carries between missions

The table applies to missions 02 onward. Mission 01 is the exception.

| Element             | Carries? | Notes                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------- |
| Soldier identity    | Yes      | Same id, name and role across missions.                               |
| Wounds and recovery | Yes      | The simulation already preserves a soldier id and remaining recovery. |
| Dead and missing    | Yes      | A dead soldier does not return. Missing is an open question.          |
| Ammunition          | TBD      | Campaign load is not decided. Training uses 5 + 45; sandbox 5 + 15.   |
| Fatigue             | No       | Reset at the start of a mission.                                      |
| Morale              | No       | Reset at the start of a mission.                                      |
| Equipment           | TBD      | Depends on a future roster system.                                    |

## Between missions

1. **Debrief:** result, time, dead, wounded, routed and objectives.
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

- Deferred. The persistence contract is an open question.
- Campaign state must be deterministic and versioned before save/load ships.

## What this file does not decide

- A legitimacy, supply or political resource. It needs a source, a sink and a
  player verb before it enters the game.
- Difficulty scaling. Change one variable at a time and record it.
- Mission length. It is an open question, not a hidden target.
