## MODIFIED Requirements

### Requirement: Active order paths

The simulation SHALL expose active move orders as ordered path points with a
kind and the participating unit ids. An order SHALL clear when all its units
reach the target. When a soldier's route is searched again on the way (a
cover or a soldier in the way), his order's path points SHALL follow the new
route from where he stands, so the drawn route is the one he walks.

#### Scenario: Move command creates a path

- **WHEN** a valid move command is applied
- **THEN** the next frame contains an order with a route from the unit group to the target

#### Scenario: Re-routed soldier updates his path

- **WHEN** a moving soldier finds his way blocked and takes a new route
- **THEN** the next frame's order for him holds the new route's points from his position

#### Scenario: Arrival clears the order

- **WHEN** every unit in the order reaches the target
- **THEN** the next frame no longer contains that order

#### Scenario: Invalid command creates no path

- **WHEN** a move command is rejected
- **THEN** no order path is added to the frame
