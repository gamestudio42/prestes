import { useEffect, useState, type ReactNode } from 'react';
import {
  ARMIES,
  LOSSES_PERCENT,
  MAX_ARRIVING_SECTIONS,
  MAX_EVENT_ACTIONS,
  MAX_EVENT_DELAY,
  MAX_EXIT_SECTIONS,
  MAX_TRIGGER_TIME,
  POSTURE_SECONDS,
  SECTION_TYPE_IDS,
  SECTION_TYPES,
  type BattleEvent,
  type EditableMap,
  type EventAction,
  type EventSide,
  type EventTrigger,
  type SectionTypeId,
} from '@prestes/shared';
import type { EditorStore } from './store';
import { addEvent, deleteEvent, deletePlace, duplicateEvent, eventDependents, moveEvent, placeUsers, renamePlace, updateEvent } from './events';

type T = (key: string, values?: Readonly<Record<string, string | number>>) => string;

const SIDES: readonly EventSide[] = ['column', 'legalist'];
const TRIGGERS: readonly EventTrigger['kind'][] = ['time', 'objective', 'area', 'losses', 'after', 'commander', 'exited'];
const ACTIONS: readonly EventAction['kind'][] = ['troops', 'posture', 'card'];

/** Seconds as m:ss. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** m:ss (or plain seconds) to seconds; null when it cannot be read. */
export function parseClock(text: string): number | null {
  const match = /^\s*(?:(\d{1,3}):)?(\d{1,4})\s*$/.exec(text);
  if (!match) return null;
  const minutes = match[1] === undefined ? 0 : Number(match[1]);
  const seconds = Number(match[2]);
  if (match[1] !== undefined && seconds >= 60) return null;
  return minutes * 60 + seconds;
}

/** A new trigger of a kind, with the map's first objective, area or event filled in. */
export function defaultTrigger(kind: EventTrigger['kind'], map: EditableMap, eventId: number): EventTrigger {
  switch (kind) {
    case 'time':
      return { kind, seconds: 60 };
    case 'objective':
      return { kind, objective: map.objectives?.[0]?.id ?? 0, side: 'column', change: 'taken' };
    case 'area':
      return { kind, area: (map.eventPlaces ?? []).find((place) => place.kind === 'area')?.id ?? 0, side: 'column' };
    case 'losses':
      return { kind, side: 'column', percent: 30 };
    case 'after':
      return { kind, event: (map.events ?? []).find((event) => event.id !== eventId)?.id ?? 0 };
    case 'commander':
      return { kind };
    case 'exited':
      return { kind, sections: 1 };
  }
}

/** A new action of a kind. */
export function defaultAction(kind: EventAction['kind'], map: EditableMap): EventAction {
  switch (kind) {
    case 'troops':
      return { kind, side: 'legalist', entry: (map.eventPlaces ?? []).find((place) => place.kind === 'entry')?.id ?? 0, sections: ['infantaria-exercito'], order: { kind: 'commander' } };
    case 'posture':
      return { kind, posture: 'offensive', until: { seconds: 120 } };
    case 'card':
      return { kind, title: { en: '', 'pt-BR': '' }, text: { en: '', 'pt-BR': '' } };
  }
}

function sideName(side: EventSide, t: T): string {
  return t(`editor.side.${side}`);
}

/** The one-line summary of an event in the list. */
export function eventSummary(event: BattleEvent, map: EditableMap, t: T): string {
  const placeName = (id: number) => (map.eventPlaces ?? []).find((place) => place.id === id)?.name ?? `#${id}`;
  const objectiveName = (id: number) => (map.objectives ?? []).find((objective) => objective.id === id)?.name['pt-BR'] || `#${id}`;
  const trigger = event.trigger;
  let when: string;
  if (!trigger) when = t('editor.events.summary.none');
  else if (trigger.kind === 'time') when = t('editor.events.summary.time', { time: formatClock(trigger.seconds) });
  else if (trigger.kind === 'objective') when = t(`editor.events.summary.objective.${trigger.change}`, { objective: objectiveName(trigger.objective), side: sideName(trigger.side, t) });
  else if (trigger.kind === 'area') when = t('editor.events.summary.area', { side: sideName(trigger.side, t), area: placeName(trigger.area) });
  else if (trigger.kind === 'losses') when = t('editor.events.summary.losses', { side: sideName(trigger.side, t), percent: trigger.percent });
  else if (trigger.kind === 'after') when = t('editor.events.summary.after', { event: trigger.event });
  else if (trigger.kind === 'commander') when = t('editor.events.summary.commander');
  else if (trigger.command) when = t('editor.events.summary.exited.command');
  else when = t('editor.events.summary.exited', { count: trigger.sections });
  if (event.delay > 0) when += ` ${t('editor.events.summary.delay', { time: formatClock(event.delay) })}`;
  const what = event.actions.map((action) => t(`editor.events.action.${action.kind}`)).join(', ') || t('editor.events.summary.nothing');
  return `${when} → ${what}`;
}

/** A m:ss field that commits on blur or Enter; an unreadable entry goes back to the stored value. */
function ClockInput({ seconds, min, max, label, testId, onChange }: { seconds: number; min: number; max: number; label: string; testId: string; onChange: (seconds: number) => void }): ReactNode {
  const [text, setText] = useState(formatClock(seconds));
  useEffect(() => setText(formatClock(seconds)), [seconds]);
  const commit = () => {
    const value = parseClock(text);
    if (value === null) setText(formatClock(seconds));
    else {
      const clamped = Math.max(min, Math.min(max, value));
      setText(formatClock(clamped));
      if (clamped !== seconds) onChange(clamped);
    }
  };
  return (
    <label>
      {label}
      <input type="text" inputMode="numeric" size={6} data-testid={testId} value={text} onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === 'Enter' && commit()} />
    </label>
  );
}

function SideSelect({ side, label, testId, onChange, t }: { side: EventSide; label: string; testId: string; onChange: (side: EventSide) => void; t: T }): ReactNode {
  return (
    <label>
      {label}
      <select data-testid={testId} value={side} onChange={(event) => onChange(event.target.value as EventSide)}>
        {SIDES.map((entry) => (
          <option key={entry} value={entry}>{sideName(entry, t)}</option>
        ))}
      </select>
    </label>
  );
}

function IdSelect({ value, label, testId, options, onChange, t }: { value: number; label: string; testId: string; options: readonly { id: number; name: string }[]; onChange: (id: number) => void; t: T }): ReactNode {
  const known = options.some((option) => option.id === value);
  return (
    <label>
      {label}
      <select data-testid={testId} value={known ? String(value) : ''} onChange={(event) => onChange(Number(event.target.value))}>
        {!known ? <option value="">{t('editor.events.choose')}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * add-battle-events 4.3: the Events panel. The map's events in order, each
 * with a one-line summary, and the form of the open one: its trigger, delay
 * and actions. Every change is one undo step.
 */
export function EventsPanel({ store, t }: { store: EditorStore; t: T }): ReactNode {
  const map = store.map;
  const events = map.events ?? [];
  const places = map.eventPlaces ?? [];
  const selected = store.selection.find((item) => item.kind === 'event');
  const selectedId = selected && 'id' in selected ? selected.id : undefined;
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedId !== undefined) setOpenId(selectedId);
  }, [selectedId]);
  const open = events.find((event) => event.id === openId) ?? null;

  const select = (id: number) => {
    setOpenId(id);
    store.setSelection([{ kind: 'event', id }]);
  };
  const edit = (next: BattleEvent) => store.editVector((draft) => updateEvent(draft, next));
  const remove = (event: BattleEvent) => {
    const dependents = eventDependents(events, event.id);
    if (dependents.length > 0 && !window.confirm(t('editor.events.confirmDelete', { events: dependents.map((entry) => `${entry.id}. ${entry.label}`).join(', ') }))) return;
    store.setSelection([]);
    store.editVector((draft) => deleteEvent(draft, event.id));
  };

  return (
    <section className="editor-events" data-testid="editor-events">
      <h3>{t('editor.events.title')}</h3>
      <p className="editor-hint">{t('editor.events.hint')}</p>
      {events.length === 0 ? <p className="editor-hint">{t('editor.events.none')}</p> : null}
      <ol className="editor-events-list">
        {events.map((event, index) => (
          <li key={event.id} data-testid={`event-${event.id}`} aria-current={event.id === openId ? 'true' : undefined}>
            <button type="button" className="editor-events-open" data-testid={`event-${event.id}-open`} onClick={() => select(event.id)}>
              <strong>{event.id}. {event.label}</strong>
              <span data-testid={`event-${event.id}-summary`}>{eventSummary(event, map, t)}</span>
            </button>
            <span className="editor-row">
              <button type="button" disabled={index === 0} aria-label={t('editor.events.up')} title={t('editor.events.up')} onClick={() => { store.editVector((draft) => moveEvent(draft, event.id, -1)); select(index); }}>↑</button>
              <button type="button" disabled={index === events.length - 1} aria-label={t('editor.events.down')} title={t('editor.events.down')} onClick={() => { store.editVector((draft) => moveEvent(draft, event.id, 1)); select(index + 2); }}>↓</button>
              <button type="button" aria-label={t('editor.events.duplicate')} title={t('editor.events.duplicate')} onClick={() => {
                const copy: { id: number | null } = { id: null };
                store.editVector((draft) => { copy.id = duplicateEvent(draft, event.id, (label) => t('editor.events.copyLabel', { label })); });
                if (copy.id !== null) select(copy.id);
              }}>⧉</button>
              <button type="button" data-testid={`event-${event.id}-delete`} aria-label={t('editor.events.delete')} title={t('editor.events.delete')} onClick={() => remove(event)}>×</button>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" data-testid="event-add" onClick={() => {
        const added = { id: 0 };
        store.editVector((draft) => { added.id = addEvent(draft, (n) => t('editor.events.newLabel', { n })); });
        select(added.id);
      }}>
        {t('editor.events.add')}
      </button>

      {open ? <EventForm key={open.id} event={open} map={map} onChange={edit} t={t} /> : null}

      <h4>{t('editor.events.places')}</h4>
      {places.length === 0 ? <p className="editor-hint">{t('editor.events.noPlaces')}</p> : null}
      <ul className="editor-events-places">
        {places.map((place) => (
          <li key={place.id} data-testid={`event-place-${place.id}`}>
            <input
              type="text"
              aria-label={t(`editor.tool.${place.kind === 'entry' ? 'entry-point' : 'event-area'}`)}
              value={place.name}
              onFocus={() => store.setSelection([{ kind: 'event-place', id: place.id }])}
              onChange={(event) => store.editVector((draft) => renamePlace(draft, place.id, event.target.value))}
            />
            <small>{t(`editor.tool.${place.kind === 'entry' ? 'entry-point' : 'event-area'}`)}</small>
            <button type="button" aria-label={t('editor.events.delete')} onClick={() => {
              const users = placeUsers(events, place.id);
              if (users.length > 0 && !window.confirm(t('editor.event.place.confirmDelete', { events: users.map((entry) => entry.label).join(', ') }))) return;
              store.setSelection([]);
              store.editVector((draft) => deletePlace(draft, place.id));
            }}>×</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventForm({ event, map, onChange, t }: { event: BattleEvent; map: EditableMap; onChange: (event: BattleEvent) => void; t: T }): ReactNode {
  const objectives = (map.objectives ?? []).map((objective) => ({ id: objective.id, name: objective.name['pt-BR'] || objective.name.en || `#${objective.id}` }));
  const areas = (map.eventPlaces ?? []).filter((place) => place.kind === 'area').map((place) => ({ id: place.id, name: place.name }));
  const entries = (map.eventPlaces ?? []).filter((place) => place.kind === 'entry').map((place) => ({ id: place.id, name: place.name }));
  const others = (map.events ?? []).filter((other) => other.id !== event.id).map((other) => ({ id: other.id, name: `${other.id}. ${other.label}` }));
  const trigger = event.trigger;
  const setTrigger = (next: EventTrigger | null) => onChange({ ...event, trigger: next });
  const setAction = (index: number, next: EventAction) => onChange({ ...event, actions: event.actions.map((action, at) => (at === index ? next : action)) });
  const [adding, setAdding] = useState<EventAction['kind']>('troops');

  return (
    <div className="editor-event-form" data-testid="event-form">
      <label>
        {t('editor.events.label')}
        <input type="text" data-testid="event-label" value={event.label} onChange={(entry) => onChange({ ...event, label: entry.target.value })} />
      </label>

      <fieldset>
        <legend>{t('editor.events.trigger')}</legend>
        <select data-testid="event-trigger" aria-label={t('editor.events.trigger')} value={trigger?.kind ?? ''} onChange={(entry) => setTrigger(entry.target.value ? defaultTrigger(entry.target.value as EventTrigger['kind'], map, event.id) : null)}>
          {!trigger ? <option value="">{t('editor.events.choose')}</option> : null}
          {/* add-withdrawal-exits D6: "exited" only while the map has exits (or the event already uses it). */}
          {TRIGGERS.filter((kind) => kind !== 'exited' || (map.withdrawal?.exits.length ?? 0) > 0 || trigger?.kind === 'exited').map((kind) => (
            <option key={kind} value={kind}>{t(`editor.events.trigger.${kind}`)}</option>
          ))}
        </select>
        {trigger?.kind === 'time' ? (
          <ClockInput seconds={trigger.seconds} min={0} max={MAX_TRIGGER_TIME} label={t('editor.events.time')} testId="event-time" onChange={(seconds) => setTrigger({ ...trigger, seconds })} />
        ) : null}
        {trigger?.kind === 'objective' ? (
          <>
            <IdSelect value={trigger.objective} label={t('editor.events.objective')} testId="event-objective" options={objectives} onChange={(objective) => setTrigger({ ...trigger, objective })} t={t} />
            <label>
              {t('editor.events.change')}
              <select data-testid="event-change" value={trigger.change} onChange={(entry) => setTrigger({ ...trigger, change: entry.target.value as 'taken' | 'lost' })}>
                <option value="taken">{t('editor.events.change.taken')}</option>
                <option value="lost">{t('editor.events.change.lost')}</option>
              </select>
            </label>
            <SideSelect side={trigger.side} label={t('editor.events.side')} testId="event-side" onChange={(side) => setTrigger({ ...trigger, side })} t={t} />
          </>
        ) : null}
        {trigger?.kind === 'area' ? (
          <>
            <SideSelect side={trigger.side} label={t('editor.events.side')} testId="event-side" onChange={(side) => setTrigger({ ...trigger, side })} t={t} />
            <IdSelect value={trigger.area} label={t('editor.events.area')} testId="event-area" options={areas} onChange={(area) => setTrigger({ ...trigger, area })} t={t} />
          </>
        ) : null}
        {trigger?.kind === 'losses' ? (
          <>
            <SideSelect side={trigger.side} label={t('editor.events.side')} testId="event-side" onChange={(side) => setTrigger({ ...trigger, side })} t={t} />
            <label>
              {t('editor.events.percent')}
              <input type="number" data-testid="event-percent" min={LOSSES_PERCENT.min} max={LOSSES_PERCENT.max} step={LOSSES_PERCENT.step} value={trigger.percent} onChange={(entry) => {
                const value = Number(entry.target.value);
                if (Number.isFinite(value)) setTrigger({ ...trigger, percent: Math.max(LOSSES_PERCENT.min, Math.min(LOSSES_PERCENT.max, Math.round(value / LOSSES_PERCENT.step) * LOSSES_PERCENT.step)) });
              }} />
            </label>
          </>
        ) : null}
        {trigger?.kind === 'exited' ? (
          <>
            <label>
              <input type="checkbox" data-testid="event-exited-command" checked={trigger.command === true} onChange={(entry) => setTrigger(entry.target.checked ? { kind: 'exited', command: true } : { kind: 'exited', sections: 1 })} />
              {t('editor.events.exitedCommand')}
            </label>
            {!trigger.command ? (
              <label>
                {t('editor.events.exitedSections')}
                <input type="number" data-testid="event-exited-sections" min={1} max={MAX_EXIT_SECTIONS} step={1} value={trigger.sections} onChange={(entry) => {
                  const value = Number(entry.target.value);
                  if (Number.isFinite(value)) setTrigger({ kind: 'exited', sections: Math.max(1, Math.min(MAX_EXIT_SECTIONS, Math.round(value))) });
                }} />
              </label>
            ) : null}
          </>
        ) : null}
        {trigger?.kind === 'after' ? (
          <IdSelect value={trigger.event} label={t('editor.events.afterEvent')} testId="event-after" options={others} onChange={(id) => setTrigger({ ...trigger, event: id })} t={t} />
        ) : null}
        <ClockInput seconds={event.delay} min={0} max={MAX_EVENT_DELAY} label={t('editor.events.delay')} testId="event-delay" onChange={(delay) => onChange({ ...event, delay })} />
      </fieldset>

      <fieldset>
        <legend>{t('editor.events.actions')}</legend>
        {event.actions.map((action, index) => (
          <div key={index} className="editor-event-action" data-testid={`event-action-${index}`} data-kind={action.kind}>
            <div className="editor-row">
              <strong>{t(`editor.events.action.${action.kind}`)}</strong>
              <button type="button" data-testid={`event-action-${index}-remove`} onClick={() => onChange({ ...event, actions: event.actions.filter((_, at) => at !== index) })}>{t('editor.events.removeAction')}</button>
            </div>
            {action.kind === 'troops' ? <TroopsFields action={action} index={index} entries={entries} objectives={objectives} onChange={(next) => setAction(index, next)} t={t} /> : null}
            {action.kind === 'posture' ? (
              <>
                <label>
                  {t('editor.events.posture')}
                  <select data-testid={`event-action-${index}-posture`} value={action.posture} onChange={(entry) => {
                    const posture = entry.target.value as typeof action.posture;
                    const { area: _area, ...rest } = action;
                    void _area;
                    setAction(index, posture === 'fall-back' ? { ...action, posture } : { ...rest, posture });
                  }}>
                    {(['offensive', 'fall-back', 'hold'] as const).map((posture) => (
                      <option key={posture} value={posture}>{t(`editor.events.posture.${posture}`)}</option>
                    ))}
                  </select>
                </label>
                {action.posture === 'fall-back' ? (
                  <label>
                    {t('editor.events.fallBackArea')}
                    <select data-testid={`event-action-${index}-area`} value={action.area === undefined ? '' : String(action.area)} onChange={(entry) => {
                      const { area: _area, ...rest } = action;
                      void _area;
                      setAction(index, entry.target.value ? { ...rest, area: Number(entry.target.value) } : rest);
                    }}>
                      <option value="">{t('editor.events.fallBackDefault')}</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  {t('editor.events.until')}
                  <select data-testid={`event-action-${index}-until`} value={'event' in action.until ? 'event' : 'seconds'} onChange={(entry) => setAction(index, { ...action, until: entry.target.value === 'event' ? { event: others[0]?.id ?? 0 } : { seconds: 120 } })}>
                    <option value="seconds">{t('editor.events.until.seconds')}</option>
                    <option value="event">{t('editor.events.until.event')}</option>
                  </select>
                </label>
                {'event' in action.until ? (
                  <IdSelect value={action.until.event} label={t('editor.events.afterEvent')} testId={`event-action-${index}-until-event`} options={others} onChange={(id) => setAction(index, { ...action, until: { event: id } })} t={t} />
                ) : (
                  <ClockInput seconds={action.until.seconds} min={POSTURE_SECONDS.min} max={POSTURE_SECONDS.max} label={t('editor.events.duration')} testId={`event-action-${index}-duration`} onChange={(seconds) => setAction(index, { ...action, until: { seconds } })} />
                )}
              </>
            ) : null}
            {action.kind === 'card' ? (
              <div className="editor-event-card">
                {(['pt-BR', 'en'] as const).map((language) => (
                  <div key={language}>
                    <h5>{t(`editor.events.language.${language}`)}</h5>
                    <label>
                      {t('editor.events.cardTitle')}
                      <input type="text" data-testid={`event-action-${index}-title-${language}`} value={action.title[language]} onChange={(entry) => setAction(index, { ...action, title: { ...action.title, [language]: entry.target.value } })} />
                    </label>
                    <label>
                      {t('editor.events.cardText')}
                      <textarea rows={5} data-testid={`event-action-${index}-text-${language}`} value={action.text[language]} onChange={(entry) => setAction(index, { ...action, text: { ...action.text, [language]: entry.target.value } })} />
                    </label>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {event.actions.length < MAX_EVENT_ACTIONS ? (
          <div className="editor-row">
            <select data-testid="event-action-kind" aria-label={t('editor.events.addAction')} value={adding} onChange={(entry) => setAdding(entry.target.value as EventAction['kind'])}>
              {ACTIONS.map((kind) => (
                <option key={kind} value={kind}>{t(`editor.events.action.${kind}`)}</option>
              ))}
            </select>
            <button type="button" data-testid="event-action-add" onClick={() => onChange({ ...event, actions: [...event.actions, defaultAction(adding, map)] })}>{t('editor.events.addAction')}</button>
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}

function TroopsFields({ action, index, entries, objectives, onChange, t }: {
  action: Extract<EventAction, { kind: 'troops' }>;
  index: number;
  entries: readonly { id: number; name: string }[];
  objectives: readonly { id: number; name: string }[];
  onChange: (action: Extract<EventAction, { kind: 'troops' }>) => void;
  t: T;
}): ReactNode {
  const armies = Object.values(ARMIES).filter((army) => army.side === action.side);
  const firstType = SECTION_TYPE_IDS.find((type) => armies.some((army) => army.id === SECTION_TYPES[type].army))!;
  const [adding, setAdding] = useState<SectionTypeId>(firstType);
  const choice = armies.some((army) => army.id === SECTION_TYPES[adding].army) ? adding : firstType;
  const order = action.order;
  return (
    <>
      <SideSelect side={action.side} label={t('editor.events.side')} testId={`event-action-${index}-side`} onChange={(side) => {
        const type = SECTION_TYPE_IDS.find((entry) => ARMIES[SECTION_TYPES[entry].army].side === side)!;
        onChange({ ...action, side, sections: [type], order: side === 'column' && order.kind === 'commander' ? { kind: 'stay' } : order });
      }} t={t} />
      <IdSelect value={action.entry} label={t('editor.events.entry')} testId={`event-action-${index}-entry`} options={entries} onChange={(entry) => onChange({ ...action, entry })} t={t} />
      <div>
        <span>{t('editor.events.sections')}</span>
        <ol className="editor-enemy-sections">
          {action.sections.map((type, at) => (
            <li key={`${type}-${at}`}>
              {t(SECTION_TYPES[type].nameKey)}
              <button type="button" aria-label={t('editor.events.removeAction')} onClick={() => onChange({ ...action, sections: action.sections.filter((_, other) => other !== at) })}>×</button>
            </li>
          ))}
        </ol>
        {action.sections.length < MAX_ARRIVING_SECTIONS ? (
          <div className="editor-row">
            <select data-testid={`event-action-${index}-type`} aria-label={t('editor.events.sections')} value={choice} onChange={(entry) => setAdding(entry.target.value as SectionTypeId)}>
              {armies.map((army) => (
                <optgroup key={army.id} label={t(army.nameKey)}>
                  {SECTION_TYPE_IDS.filter((type) => SECTION_TYPES[type].army === army.id).map((type) => (
                    <option key={type} value={type}>{t(SECTION_TYPES[type].nameKey)} ({SECTION_TYPES[type].men.length})</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="button" data-testid={`event-action-${index}-add-section`} onClick={() => onChange({ ...action, sections: [...action.sections, choice] })}>{t('editor.events.addSection')}</button>
          </div>
        ) : null}
      </div>
      <label>
        {t('editor.events.order')}
        <select data-testid={`event-action-${index}-order`} value={order.kind} onChange={(entry) => {
          const kind = entry.target.value as typeof order.kind;
          onChange({ ...action, order: kind === 'move' ? { kind, to: { x: 0, y: 0 } } : kind === 'objective' ? { kind, objective: objectives[0]?.id ?? 0 } : { kind } });
        }}>
          <option value="stay">{t('editor.events.order.stay')}</option>
          <option value="move">{t('editor.events.order.move')}</option>
          <option value="objective">{t('editor.events.order.objective')}</option>
          {action.side === 'legalist' ? <option value="commander">{t('editor.events.order.commander')}</option> : null}
        </select>
      </label>
      {order.kind === 'move' ? (
        <div className="editor-row">
          {(['x', 'y'] as const).map((axis) => (
            <label key={axis}>
              {t(`editor.events.order.${axis}`)}
              <input type="number" step={1} data-testid={`event-action-${index}-to-${axis}`} value={order.to[axis]} onChange={(entry) => {
                const value = Number(entry.target.value);
                if (Number.isFinite(value)) onChange({ ...action, order: { kind: 'move', to: { ...order.to, [axis]: Math.round(value) } } });
              }} />
            </label>
          ))}
        </div>
      ) : null}
      {order.kind === 'objective' ? (
        <IdSelect value={order.objective} label={t('editor.events.objective')} testId={`event-action-${index}-objective`} options={objectives} onChange={(objective) => onChange({ ...action, order: { kind: 'objective', objective } })} t={t} />
      ) : null}
    </>
  );
}
