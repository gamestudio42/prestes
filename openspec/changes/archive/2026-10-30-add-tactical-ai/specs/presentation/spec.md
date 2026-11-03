## ADDED Requirements

### Requirement: Basic orders panel

The HUD SHALL show a bottom orders panel in the spirit of Men of War, with a
selected-section card on the left, an order grid in the centre and the current
order and section status on the right. The panel SHALL use the existing Barlow
fonts, Lucide icons and Prestes palette, and SHALL NOT copy another game's art or
layout.

#### Scenario: Panel appears after start

- **WHEN** the player starts the skirmish
- **THEN** the orders panel is visible with section cards, order buttons and status

#### Scenario: Panel follows selection

- **WHEN** the player selects another section
- **THEN** the card, alive count, health, ammunition and morale in the panel update

### Requirement: Section cards

The panel SHALL show a card for each player section with a named placeholder
portrait, section name, alive count and compact health, ammunition and morale
bars. The portrait SHALL be explicitly named as a placeholder until final art
exists.

#### Scenario: Section card status

- **WHEN** combat changes a section's health, ammunition or morale
- **THEN** its card bars and values update from the frame

#### Scenario: Placeholder portrait is named

- **WHEN** the asset register is inspected
- **THEN** the section portrait is listed as a placeholder

### Requirement: Order buttons and modes

The panel SHALL expose move, attack, suppress, flank, withdraw and hold-position
orders, plus standing, crouched and prone stances. Selecting move, attack,
suppress or flank SHALL enter a pending order mode and SHALL show a localized
prompt to pick a target. Withdraw and hold SHALL execute immediately.

#### Scenario: Pending order prompt

- **WHEN** the player presses Suppress
- **THEN** the button becomes active and the panel asks for an enemy target

#### Scenario: Pending order is sent

- **WHEN** the player picks a living enemy while Suppress is pending
- **THEN** the selected section receives a suppress command and the pending mode clears

#### Scenario: Cancel pending order

- **WHEN** the player presses Cancel or Escape
- **THEN** the pending mode clears without sending a command

### Requirement: Immediate orders

Withdraw and hold-position SHALL send their commands immediately for every living
unit in the selected section. The panel SHALL show the resulting current order
without waiting for a target click.

#### Scenario: Withdraw is immediate

- **WHEN** the player presses Withdraw
- **THEN** the panel shows a withdraw order and the selected units receive a withdraw command

#### Scenario: Hold is immediate

- **WHEN** the player presses Hold
- **THEN** the panel shows a hold order and the selected units receive a hold command

### Requirement: Localized order feedback

Every panel label, prompt, active-order label and rejection message SHALL come
from the PT-BR and EN locale catalogs. The panel SHALL contain no hardcoded
player-facing text.

#### Scenario: Locale switch updates the panel

- **WHEN** the player switches between PT-BR and EN
- **THEN** every order label, prompt and status updates without a reload

#### Scenario: Locale catalogs match

- **WHEN** `pnpm check:locales` runs
- **THEN** both catalogs contain the same panel keys
