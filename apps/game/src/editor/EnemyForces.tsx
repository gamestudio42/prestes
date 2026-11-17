import { useState, type ReactNode } from 'react';
import { ARMIES, canAdd, defaultRoster, rosterArmies, FORCE_LIMITS, SECTION_TYPE_IDS, SECTION_TYPES, validateRoster, type MapSize, type Roster, type SectionTypeId } from '@prestes/shared';
import { refusalMessage } from '../ui/menu/setupState';

type T = (key: string, values?: Readonly<Record<string, string | number>>) => string;

/**
 * author-game-maps: the map's enemy presets, in the map properties dialog.
 * One is drawn per battle when the player brings a roster; with none the
 * enemy fields the default three rifle sections. The same rules as the
 * skirmish roster builder (pre-battle-roster): a section that would break
 * them cannot be added, and the reason is shown.
 */
export function EnemyForces({ presets, onChange, t, size = 'small' }: { presets: readonly Roster[]; onChange: (presets: Roster[]) => void; t: T; size?: MapSize }): ReactNode {
  const [adding, setAdding] = useState<Record<number, SectionTypeId>>({});
  const set = (index: number, roster: Roster) => onChange(presets.map((preset, at) => (at === index ? roster : preset)));
  const choice = (index: number): SectionTypeId => adding[index] ?? 'infantaria-exercito';
  return (
    <fieldset className="editor-enemy" data-testid="enemy-forces">
      <legend>{t('editor.enemy.title')}</legend>
      <p className="editor-hint">{t(presets.length === 0 ? 'editor.enemy.none' : 'editor.enemy.hint')}</p>
      {presets.map((preset, index) => {
        const check = validateRoster(preset, undefined, size);
        const refusal = canAdd(preset, choice(index), undefined, size);
        // scale-forces-by-map-size: a preset kept from a larger map size says what it breaks.
        const over = check.refusals.find((refused) => refused.code !== 'empty');
        const reason = refusal ? refusalMessage(refusal) : null;
        return (
          <div key={index} className="editor-enemy-preset" data-testid={`enemy-preset-${index}`}>
            <div className="editor-row">
              <strong>{t('editor.enemy.preset', { number: index + 1 })}</strong>
              <span data-testid={`enemy-preset-${index}-armies`}>{rosterArmies(preset).map((army) => t(ARMIES[army].nameKey)).join(' + ')}</span>
              <span data-testid={`enemy-preset-${index}-counters`}>
                {t('setup.counters', { men: check.men, maxMen: FORCE_LIMITS[size].men, sections: check.sections, maxSections: FORCE_LIMITS[size].sections })}
              </span>
              {over ? (
                <span className="roster-over" role="alert" data-testid={`enemy-preset-${index}-over`}>
                  {(() => {
                    const why = refusalMessage(over);
                    return t('setup.overMap', { reason: t(why.key, why.values) });
                  })()}
                </span>
              ) : null}
              <button type="button" data-testid={`enemy-preset-${index}-remove`} onClick={() => onChange(presets.filter((_, at) => at !== index))}>
                {t('editor.enemy.remove')}
              </button>
            </div>
            <ol className="editor-enemy-sections">
              {preset.sections.map((type, at) => (
                <li key={`${type}-${at}`}>
                  {t(SECTION_TYPES[type].nameKey)}
                  <button
                    type="button"
                    aria-label={t('setup.remove')}
                    data-testid={`enemy-preset-${index}-section-${at}-remove`}
                    onClick={() => set(index, { sections: preset.sections.filter((_, other) => other !== at) })}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            {preset.sections.length === 0 ? <p className="editor-hint">{t('setup.refuse.empty')}</p> : null}
            <div className="editor-row">
              <select
                aria-label={t('editor.enemy.section')}
                data-testid={`enemy-preset-${index}-type`}
                value={choice(index)}
                onChange={(event) => setAdding({ ...adding, [index]: event.target.value as SectionTypeId })}
              >
                {Object.values(ARMIES)
                  .filter((army) => army.side === 'legalist')
                  .map((army) => (
                    <optgroup key={army.id} label={t(army.nameKey)}>
                      {SECTION_TYPE_IDS.filter((type) => SECTION_TYPES[type].army === army.id).map((type) => (
                        <option key={type} value={type}>
                          {t(SECTION_TYPES[type].nameKey)} ({SECTION_TYPES[type].men.length})
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
              <button
                type="button"
                data-testid={`enemy-preset-${index}-add`}
                disabled={refusal !== null}
                onClick={() => set(index, { sections: [...preset.sections, choice(index)] })}
              >
                {t('editor.enemy.addSection')}
              </button>
            </div>
            {reason ? (
              <p className="editor-hint" data-testid={`enemy-preset-${index}-refusal`}>
                {t(reason.key, reason.values)}
              </p>
            ) : null}
          </div>
        );
      })}
      <button type="button" data-testid="enemy-preset-add" onClick={() => onChange([...presets, defaultRoster('legalista')])}>
        {t('editor.enemy.add')}
      </button>
    </fieldset>
  );
}
