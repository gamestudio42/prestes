import { useEffect, useRef } from 'react';
import { translate, type Locale } from '@prestes/content';
import { cardText, type EventCard } from '../client/event-cards';

export interface EventCardPanelProps {
  locale: Locale;
  card: EventCard;
  /** Cards still waiting after this one. */
  waiting: number;
  onClose: () => void;
}

/** add-battle-events 3.1: a map event's narrative card, a parchment page over the paused battle. */
export function EventCardPanel({ locale, card, waiting, onClose }: EventCardPanelProps) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), [card]);
  return (
    <div className="event-card-backdrop" data-testid="event-card">
      <section className="event-card" role="dialog" aria-modal="true" aria-labelledby="event-card-title">
        <p className="event-card-paused">{translate(locale, 'battle.eventCard.paused')}</p>
        <h2 id="event-card-title" className="event-card-title" data-testid="event-card-title">
          {cardText(card.title, locale)}
        </h2>
        <p className="event-card-text" data-testid="event-card-text">
          {cardText(card.text, locale)}
        </p>
        <button ref={close} type="button" className="event-card-close" onClick={onClose} data-testid="event-card-close">
          {translate(locale, waiting > 0 ? 'battle.eventCard.next' : 'battle.eventCard.close')}
        </button>
      </section>
    </div>
  );
}
