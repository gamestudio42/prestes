## ADDED Requirements

### Requirement: Queued orders

A section SHALL hold a queue of at most three orders given with Shift: a
Shift order SHALL be appended to the queue instead of replacing the current
primary order, and queued orders SHALL run in the order given, each becoming
active when the previous order completes or is cleared. Halt and Escape SHALL
clear the queue together with the current order. A queued order SHALL be
validated when it is given and again when it becomes active; one that is no
longer valid at activation SHALL be dropped with a localized rejection event
without changing the world. The queue SHALL be deterministic and part of the
hashed state.

#### Scenario: Shift appends
- **WHEN** the player holds Shift and gives a move order to a section that already has an active order
- **THEN** the order joins the queue and the current order is unchanged

#### Scenario: The queue runs in order
- **WHEN** the active order completes or is cleared
- **THEN** the next queued order becomes active, in the order it was given

#### Scenario: Halt clears the queue
- **WHEN** the player gives Halt or presses Escape
- **THEN** the current order and every queued order are cleared and the section takes cover

#### Scenario: Invalid at activation
- **WHEN** a queued attack's target dies before the order becomes active
- **THEN** the order is dropped with a rejection event and the following queued order becomes active

#### Scenario: Queue limit
- **WHEN** a section already holds three queued orders and the player shifts another one
- **THEN** the order is refused and the queue is unchanged
