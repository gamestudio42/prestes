import { useState } from 'react';
import { translate, type Locale } from '@prestes/content';
import type { BattleEventState } from '@prestes/shared';

const TICKS_PER_SECOND = 10;

function clock(ticks: number): string {
  const seconds = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export interface PlaytestEventsPanelProps {
  locale: Locale;
  events: readonly BattleEventState[];
  onFire: (eventId: number) => void;
}

/**
 * add-battle-events 4.4: the playtest's events, for the map author only:
 * each event's state and fire time, and a button that fires it now.
 */
export function PlaytestEventsPanel({ locale, events, onFire }: PlaytestEventsPanelProps) {
  const [open, setOpen] = useState(true);
  if (events.length === 0) return null;
  return (
    <section className="playtest-events" data-testid="playtest-events" aria-label={translate(locale, 'battle.playtestEvents.title')}>
      <button type="button" className="playtest-events-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        {translate(locale, 'battle.playtestEvents.title')}
      </button>
      {open ? (
        <ol>
          {events.map((event) => (
            <li key={event.id} data-testid={`playtest-event-${event.id}`} data-state={event.state}>
              <span className="playtest-events-label">
                {event.id}. {event.label}
              </span>
              <span className="playtest-events-state">
                {event.state === 'fired' && event.firedAt !== undefined
                  ? translate(locale, 'battle.playtestEvents.firedAt', { time: clock(event.firedAt) })
                  : translate(locale, `battle.playtestEvents.${event.state}`)}
              </span>
              <button type="button" disabled={event.state === 'fired'} onClick={() => onFire(event.id)} data-testid={`playtest-event-${event.id}-fire`}>
                {translate(locale, 'battle.playtestEvents.fire')}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
