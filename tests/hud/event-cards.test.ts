import { describe, expect, it } from 'vitest';
import { cardText, closeEventCard, NO_EVENT_CARDS, openEventCards, type EventCard } from '../../apps/game/src/client/event-cards';

// add-battle-events 3.1: the card queue and the speed it puts back.
const card = (eventId: number): EventCard => ({ eventId, title: { en: `T${eventId}`, 'pt-BR': `Título ${eventId}` }, text: { en: 'Text', 'pt-BR': 'Texto' } });

describe('event cards', () => {
  it('the first card remembers the speed and closing the last puts it back', () => {
    const open = openEventCards(NO_EVENT_CARDS, [card(1)], 2);
    expect(open.cards).toHaveLength(1);
    expect(open.resume).toBe(2);
    expect(closeEventCard(open)).toEqual({ state: NO_EVENT_CARDS, resume: 2 });
  });

  it('cards due together show one after the other, in event order, and resume after the last', () => {
    let state = openEventCards(NO_EVENT_CARDS, [card(1), card(2)], 4);
    // A card that fires while one is open keeps the speed from before the first.
    state = openEventCards(state, [card(3)], 0);
    expect(state.cards.map((entry) => entry.eventId)).toEqual([1, 2, 3]);
    expect(state.resume).toBe(4);
    let closed = closeEventCard(state);
    expect(closed.resume).toBeNull();
    closed = closeEventCard(closed.state);
    expect(closed.resume).toBeNull();
    expect(closed.state.cards.map((entry) => entry.eventId)).toEqual([3]);
    expect(closeEventCard(closed.state).resume).toBe(4);
  });

  it('opening nothing changes nothing', () => {
    expect(openEventCards(NO_EVENT_CARDS, [], 2)).toBe(NO_EVENT_CARDS);
  });

  it('shows the game language, falling back to the other when empty', () => {
    expect(cardText({ en: 'They come', 'pt-BR': 'Eles vêm' }, 'pt-BR')).toBe('Eles vêm');
    expect(cardText({ en: 'They come', 'pt-BR': 'Eles vêm' }, 'en')).toBe('They come');
    expect(cardText({ en: 'They come', 'pt-BR': ' ' }, 'pt-BR')).toBe('They come');
  });
});
