import { useState, type ReactNode } from 'react';
import { canAdd, defaultRoster, ROSTER_MAX_MEN, ROSTER_MAX_SECTIONS, SECTION_TYPE_IDS, SECTION_TYPES, validateRoster, type Roster, type SectionTypeId } from '@prestes/shared';
import { refusalMessage } from '../ui/menu/setupState';

type T = (key: string, values?: Readonly<Record<string, string | number>>) => string;

/**
 * The column's fixed force, in the map properties dialog: a campaign mission
 * can give the player a set force (the 18 of Copacabana) instead of the one
 * the player builds. Off by default; the same roster rules as the skirmish
 * builder, the column's sections only.
 */
export function ColumnForce({ force, onChange, t }: { force: Roster | undefined; onChange: (force: Roster | undefined) => void; t: T }): ReactNode {
  const [adding, setAdding] = useState<SectionTypeId>('fuzileiros');
  const check = force ? validateRoster(force, 'coluna') : null;
  const refusal = force ? canAdd(force, adding) : null;
  const reason = refusal ? refusalMessage(refusal) : null;
  return (
    <fieldset className="editor-enemy" data-testid="column-force">
      <legend>{t('editor.column.title')}</legend>
      <label className="editor-row">
        <input
          type="checkbox"
          data-testid="column-force-on"
          checked={force !== undefined}
          onChange={(event) => onChange(event.target.checked ? { sections: [...defaultRoster('coluna').sections] } : undefined)}
        />
        {t('editor.column.fixed')}
      </label>
      <p className="editor-hint">{t(force ? 'editor.column.hint' : 'editor.column.none')}</p>
      {force && check ? (
        <div className="editor-enemy-preset">
          <div className="editor-row">
            <span data-testid="column-force-counters">
              {t('setup.counters', { men: check.men, maxMen: ROSTER_MAX_MEN, sections: check.sections, maxSections: ROSTER_MAX_SECTIONS })}
            </span>
          </div>
          <ol className="editor-enemy-sections">
            {force.sections.map((type, at) => (
              <li key={`${type}-${at}`}>
                {t(SECTION_TYPES[type].nameKey)} ({SECTION_TYPES[type].men.length})
                <button
                  type="button"
                  aria-label={t('setup.remove')}
                  data-testid={`column-force-section-${at}-remove`}
                  onClick={() => onChange({ sections: force.sections.filter((_, other) => other !== at) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          {force.sections.length === 0 ? <p className="editor-hint">{t('setup.refuse.empty')}</p> : null}
          <div className="editor-row">
            <select aria-label={t('editor.enemy.section')} data-testid="column-force-type" value={adding} onChange={(event) => setAdding(event.target.value as SectionTypeId)}>
              {SECTION_TYPE_IDS.filter((type) => SECTION_TYPES[type].army === 'coluna').map((type) => (
                <option key={type} value={type}>
                  {t(SECTION_TYPES[type].nameKey)} ({SECTION_TYPES[type].men.length})
                </option>
              ))}
            </select>
            <button type="button" data-testid="column-force-add" disabled={refusal !== null} onClick={() => onChange({ sections: [...force.sections, adding] })}>
              {t('editor.enemy.addSection')}
            </button>
          </div>
          {reason ? (
            <p className="editor-hint" data-testid="column-force-refusal">
              {t(reason.key, reason.values)}
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
