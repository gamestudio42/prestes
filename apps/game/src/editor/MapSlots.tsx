import type { ReactNode } from 'react';
import { CAMPAIGN_CHAPTERS, chapterText, type Locale } from '@prestes/content';
import type { AuthoredMapEntry, MapUse } from '@prestes/shared';

type T = (key: string, values?: Readonly<Record<string, string | number>>) => string;

/**
 * author-game-maps 4.1, 4.2: a map's slot. The campaign has one slot per
 * chapter of the campaign book (in its order, named "NN Title" from the
 * campaign content); every other map is a skirmish map, or the test map.
 */
export type Slot = { use: 'skirmish' } | { use: 'test' } | { use: 'campaign'; mission: string };

export function slotValue(slot: Slot): string {
  return slot.use === 'campaign' ? `mission:${slot.mission}` : slot.use;
}

export function slotFromValue(value: string): Slot {
  if (value.startsWith('mission:')) return { use: 'campaign', mission: value.slice('mission:'.length) };
  return value === 'test' ? { use: 'test' } : { use: 'skirmish' };
}

export function slotOf(map: { use: MapUse; mission?: string }): Slot {
  if (map.use === 'campaign' && map.mission) return { use: 'campaign', mission: map.mission };
  return map.use === 'test' ? { use: 'test' } : { use: 'skirmish' };
}

/** "02 O Anel de Ferro": the chapter's number and localized title. */
export function missionLabel(mission: string, locale: Locale): string {
  const chapter = CAMPAIGN_CHAPTERS.find((entry) => entry.id === mission);
  if (!chapter) return mission;
  return `${String(chapter.number).padStart(2, '0')} ${chapterText(chapter.id, locale)?.title ?? chapter.id}`;
}

const mapName = (entry: AuthoredMapEntry, locale: Locale) => entry.name[locale] || entry.name.en || entry.id;

/**
 * The slot picker of the New map and properties dialogs. A mission another
 * map holds is marked with that map's name; in the properties dialog it
 * cannot be chosen (a map moves only to an empty slot), on a new map it can
 * (saving then asks to replace the other map).
 */
export function SlotSelect(props: {
  value: Slot;
  onChange: (slot: Slot) => void;
  maps: readonly AuthoredMapEntry[];
  /** The map being edited: its own slot is not "held by another". */
  selfId: string | null;
  lockFilled: boolean;
  locale: Locale;
  t: T;
}): ReactNode {
  const { maps, selfId, locale, t } = props;
  const holder = (mission: string) => maps.find((entry) => entry.use === 'campaign' && entry.mission === mission && entry.id !== selfId);
  return (
    <label>
      {t('editor.slot')}
      <select data-testid="map-slot" value={slotValue(props.value)} onChange={(event) => props.onChange(slotFromValue(event.target.value))}>
        <option value="skirmish">{t('editor.slot.skirmish')}</option>
        {props.value.use === 'test' ? <option value="test">{t('editor.slot.test')}</option> : null}
        <optgroup label={t('editor.slot.campaign')}>
          {CAMPAIGN_CHAPTERS.map((chapter) => {
            const other = holder(chapter.id);
            const label = missionLabel(chapter.id, locale);
            return (
              <option key={chapter.id} value={`mission:${chapter.id}`} disabled={props.lockFilled && other !== undefined}>
                {other ? t('editor.slot.filled', { slot: label, name: mapName(other, locale) }) : label}
              </option>
            );
          })}
        </optgroup>
      </select>
    </label>
  );
}

/** The Open dialog: the campaign missions (filled or empty), then the skirmish maps, then the test maps. */
export function OpenDialog(props: {
  maps: readonly AuthoredMapEntry[] | null;
  /** player-skirmish-maps 1.6: the maps kept in this browser. */
  own: readonly AuthoredMapEntry[] | null;
  locale: Locale;
  t: T;
  onOpen: (id: string) => void;
  onOpenOwn: (id: string) => void;
  onClose: () => void;
}): ReactNode {
  const { maps, own, locale, t } = props;
  // The project's maps are listed only where there are some (the dev server).
  const project = maps === null || maps.length > 0;
  const row = (entry: AuthoredMapEntry, label: string, open = props.onOpen, prefix = 'open') => (
    <li key={entry.id} data-testid={`${prefix}-map-${entry.id}`}>
      <span>{label}</span>
      <button type="button" data-testid={`${prefix}-${entry.id}`} onClick={() => open(entry.id)}>
        {t('editor.open.open')}
      </button>
    </li>
  );
  const of = (use: MapUse) => (maps ?? []).filter((entry) => entry.use === use);
  return (
    <div className="editor-dialog" role="dialog" aria-modal="true" aria-label={t('editor.open.title')}>
      <form
        data-testid="open-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          props.onClose();
        }}
      >
        <h2>{t('editor.open.title')}</h2>
        <p className="editor-hint">{t('editor.open.discardWarn')}</p>
        <h3>{t('editor.open.own')}</h3>
        <ul className="editor-open-list" data-testid="open-own">
          {own === null ? <li className="editor-open-empty">{t('editor.open.loading')}</li> : own.length === 0 ? <li className="editor-open-empty">{t('editor.open.ownNone')}</li> : own.map((entry) => row(entry, mapName(entry, locale), props.onOpenOwn, 'open-own'))}
        </ul>
        {project ? (
          <>
        <h3>{t('editor.slot.campaign')}</h3>
        <ul className="editor-open-list" data-testid="open-campaign">
          {CAMPAIGN_CHAPTERS.map((chapter) => {
            const label = missionLabel(chapter.id, locale);
            const entry = of('campaign').find((map) => map.mission === chapter.id);
            if (entry) return row(entry, t('editor.slot.filled', { slot: label, name: mapName(entry, locale) }));
            return (
              <li key={chapter.id} data-testid={`open-slot-${chapter.id}`} className="editor-open-empty">
                <span>{label}</span>
                <span>{t('editor.slot.empty')}</span>
              </li>
            );
          })}
        </ul>
        <h3>{t('editor.open.skirmish')}</h3>
        <ul className="editor-open-list" data-testid="open-skirmish">
          {of('skirmish').length === 0 ? <li className="editor-open-empty">{t('editor.open.none')}</li> : of('skirmish').map((entry) => row(entry, mapName(entry, locale)))}
        </ul>
        {of('test').length > 0 ? (
          <>
            <h3>{t('editor.open.test')}</h3>
            <ul className="editor-open-list" data-testid="open-test">
              {of('test').map((entry) => row(entry, mapName(entry, locale)))}
            </ul>
          </>
        ) : null}
          </>
        ) : null}
        <div className="editor-row">
          <button type="submit">{t('editor.map.close')}</button>
        </div>
      </form>
    </div>
  );
}
