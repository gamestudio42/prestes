import type { LocalizedText } from '@prestes/shared';

/**
 * add-battle-events D7: the narrative cards of the map's events, shown one
 * after the other while the battle is paused. The simulation never waits: the
 * client stops the clock while a card is open and puts back the speed it had.
 */
export type GameSpeed = 0 | 1 | 2 | 4 | 8;

export interface EventCard {
  eventId: number;
  title: LocalizedText;
  text: LocalizedText;
}

export interface EventCardState {
  /** Open first, then waiting, in the order they fired. */
  readonly cards: readonly EventCard[];
  /** The speed to put back when the last card closes. */
  readonly resume: GameSpeed;
}

export const NO_EVENT_CARDS: EventCardState = { cards: [], resume: 0 };

/** Queues cards; the first to open remembers the speed the battle had. */
export function openEventCards(state: EventCardState, cards: readonly EventCard[], speed: GameSpeed): EventCardState {
  if (cards.length === 0) return state;
  return { cards: [...state.cards, ...cards], resume: state.cards.length === 0 ? speed : state.resume };
}

/** Closes the open card; with none left, `resume` is the speed to put back. */
export function closeEventCard(state: EventCardState): { state: EventCardState; resume: GameSpeed | null } {
  const cards = state.cards.slice(1);
  if (cards.length > 0) return { state: { ...state, cards }, resume: null };
  return { state: NO_EVENT_CARDS, resume: state.resume };
}

/** A card's text in the game's language (the other language when one is empty). */
export function cardText(text: LocalizedText, locale: string): string {
  const own = locale === 'pt-BR' ? text['pt-BR'] : text.en;
  return own.trim() ? own : locale === 'pt-BR' ? text.en : text['pt-BR'];
}
