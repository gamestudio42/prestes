## MODIFIED Requirements

### Requirement: Cover-first destinations

For orders that move soldiers, the controller SHALL assign each soldier a free,
reachable cover slot near its formation destination, on the side away from the
threat, then fall back to the formation slot. Slots SHALL be reserved so no two
soldiers share one.

#### Scenario: Cover preferred
- **WHEN** a soldier has a free reachable cover slot near its formation slot
- **THEN** its commanded destination is that cover slot and the slot is reserved

#### Scenario: Formation fallback
- **WHEN** no free reachable cover slot exists
- **THEN** the soldier keeps its formation slot

#### Scenario: Travel enters cover
- **WHEN** a soldier reaches its cover slot
- **THEN** it takes the slot's stance and facing behind the cover
