import { useEffect, useRef, useState } from 'react';
import { mapText, mapThumbnail } from './SkirmishMaps';
import { ARMIES, DIFFICULTIES, ENEMY_ARMY_IDS, rosterArmies, rosterMen, SECTION_TYPES, TIME_LIMITS, type BattleMap, type Roster } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { Troop as Users } from '../icons';
import { moveFocus, RosterBuilder } from './RosterBuilder';
import { builtEnemy, DEFAULT_ARMY, setupReady, withMap, type EnemyChoice, type SkirmishSetup as Setup } from './setupState';

export interface SkirmishSetupProps {
  locale: Locale;
  setup: Setup;
  /** author-game-maps 5.2: the desk's maps (never empty: the desk opens the screen only with a map). */
  maps: readonly BattleMap[];
  onChange: (setup: Setup) => void;
  onStart: () => void;
  onBack: () => void;
}

/** Preset letters, A for the first. */
const presetLetter = (index: number) => String.fromCharCode(65 + index);

/**
 * pre-battle-roster 5.1, 5.5, 5.6: the skirmish setup screen, opened from the
 * folded map on the desk. Three columns on a planning board: the map, the
 * player's force and the enemy; "Voltar" (Escape) returns to the desk and
 * "Combater" starts the battle.
 */
export function SkirmishSetup({ locale, setup, maps, onChange, onStart, onBack }: SkirmishSetupProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) => translate(locale, key, values);
  const map = maps.find((entry) => entry.id === setup.map) ?? maps[0]!;
  const presets = map.enemyForces ?? [];
  const ready = setupReady(setup);
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set());
  const titleRef = useRef<HTMLHeadingElement>(null);
  const preview = mapThumbnail;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const setEnemy = (enemy: EnemyChoice) => onChange({ ...setup, enemy });
  const sectionList = (sections: readonly string[]) =>
    sections.map((id) => t(SECTION_TYPES[id as keyof typeof SECTION_TYPES].nameKey as MessageKey)).join(', ');
  // faction-armies 4.3: a preset shows the armies it holds.
  const armyList = (roster: Roster) => rosterArmies(roster).map((army) => t(ARMIES[army].nameKey as MessageKey)).join(' + ');

  return (
    <div className="skirmish-setup" role="dialog" aria-modal="true" aria-labelledby="skirmish-setup-title" data-testid="skirmish-setup">
      <div className="setup-board">
        <header className="setup-header">
          <h2 id="skirmish-setup-title" tabIndex={-1} ref={titleRef}>
            {t('menu.mark.skirmish')}
          </h2>
          <p>{t('setup.subtitle')}</p>
          {setup.migrated ? (
            <p className="setup-migrated" role="status" data-testid="setup-migrated">
              {t('setup.migrated')}
            </p>
          ) : null}
        </header>

        <section className="setup-column setup-map" aria-labelledby="setup-map-title">
          <h3 id="setup-map-title">{t('start.battleMap')}</h3>
          <div className="setup-map-list" role="radiogroup" aria-label={t('start.battleMap')} onKeyDown={moveFocus}>
            {maps.map((entry) => {
              const active = entry.id === map.id;
              const name = mapText(entry, 'name', locale);
              return (
                <div
                  key={entry.id}
                  role="radio"
                  tabIndex={active ? 0 : -1}
                  data-nav
                  aria-checked={active}
                  aria-label={name}
                  className={`setup-map-option ${active ? 'active' : ''}`}
                  onClick={() => onChange(withMap(setup, entry.id))}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onChange(withMap(setup, entry.id));
                  }}
                  data-testid={`map-option-${entry.id}`}
                >
                  {missing.has(entry.id) ? (
                    <span className="setup-map-thumb setup-map-thumb-missing" aria-hidden="true" />
                  ) : (
                    <img
                      className="setup-map-thumb"
                      src={preview(entry.id)}
                      width={48}
                      height={48}
                      alt=""
                      draggable={false}
                      onError={() => setMissing((current) => new Set(current).add(entry.id))}
                    />
                  )}
                  <span>{name}</span>
                </div>
              );
            })}
          </div>
          <figure className="setup-map-detail">
            {missing.has(map.id) ? null : (
              <div className="setup-map-frame">
                <img
                  className="setup-map-preview"
                  src={preview(map.id)}
                  width={192}
                  height={192}
                  alt={t('start.mapPreview', { name: mapText(map, 'name', locale) })}
                  draggable={false}
                  data-testid={`map-preview-${map.id}`}
                  onError={() => setMissing((current) => new Set(current).add(map.id))}
                />
                {(map.objectives ?? []).map((objective) => {
                  const spanX = map.bounds.maxX - map.bounds.minX || 1;
                  const spanY = map.bounds.maxY - map.bounds.minY || 1;
                  return (
                    <span
                      key={objective.id}
                      className={`setup-objective-flag ${objective.owner}`}
                      style={{
                        left: `${((objective.flag.x - map.bounds.minX) / spanX) * 100}%`,
                        top: `${((objective.flag.y - map.bounds.minY) / spanY) * 100}%`,
                      }}
                      title={objective.name[locale]}
                      data-testid={`setup-objective-flag-${objective.id}`}
                    />
                  );
                })}
              </div>
            )}
            <figcaption>
              <strong>{mapText(map, 'name', locale)}</strong>
              <span>{mapText(map, 'description', locale)}</span>
            </figcaption>
          </figure>

          <div className="setup-time-limit">
            <h4>{t('setup.timeLimit')}</h4>
            <div className="setup-time-buttons" role="radiogroup" aria-label={t('setup.timeLimit')}>
              {TIME_LIMITS.map((ticks) => (
                <button
                  key={ticks}
                  type="button"
                  className={setup.timeLimit === ticks ? 'active' : ''}
                  aria-pressed={setup.timeLimit === ticks}
                  onClick={() => onChange({ ...setup, timeLimit: ticks })}
                  data-testid={`time-limit-${ticks}`}
                >
                  {t('setup.minutes', { count: ticks / 600 })}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-difficulty" data-testid="setup-difficulty" data-value={setup.difficulty}>
            <h4>{t('setup.difficulty')}</h4>
            <div className="setup-time-buttons" role="radiogroup" aria-label={t('setup.difficulty')}>
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={setup.difficulty === level ? 'active' : ''}
                  aria-pressed={setup.difficulty === level}
                  onClick={() => onChange({ ...setup, difficulty: level })}
                  data-testid={`difficulty-${level}`}
                >
                  {t(`difficulty.${level}.name`)}
                </button>
              ))}
            </div>
            <p className="setup-difficulty-description" data-testid="setup-difficulty-description">
              {t(`difficulty.${setup.difficulty}.description`)}
            </p>
          </div>

          <div className="setup-objectives" data-testid="setup-objectives">
            <h4>{t('setup.objectives')}</h4>
            {(map.objectives ?? []).length === 0 ? (
              <p className="setup-objectives-none">{t('setup.objectiveNone')}</p>
            ) : (
              <ul>
                {(map.objectives ?? []).map((objective) => (
                  <li key={objective.id} data-testid={`setup-objective-${objective.id}`}>
                    <span className={`setup-objective-dot ${objective.owner}`} aria-hidden="true" />
                    <strong>{objective.name[locale]}</strong>
                    <span>{t('setup.objectiveStarts', { owner: t(`objective.${objective.owner}` as MessageKey) })}</span>
                    <span className="setup-objective-pips" aria-hidden="true">
                      {Array.from({ length: objective.value }, (_, index) => (
                        <i key={index} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="setup-column setup-force" aria-labelledby="setup-force-title">
          <h3 id="setup-force-title">{t('setup.yourForce')}</h3>
          <RosterBuilder
            locale={locale}
            roster={setup.roster}
            army={DEFAULT_ARMY}
            onChange={(roster) => onChange({ ...setup, roster })}
            testPrefix="roster"
            label={t('setup.yourForce')}
          />
        </section>

        <section className="setup-column setup-enemy" aria-labelledby="setup-enemy-title">
          <h3 id="setup-enemy-title">{t('setup.enemy')}</h3>
          <div className="setup-enemy-choice" role="radiogroup" aria-label={t('setup.enemy')} onKeyDown={moveFocus}>
            <label className="setup-enemy-option">
              <input
                type="radio"
                name="enemy"
                data-nav
                checked={setup.enemy.kind === 'drawn'}
                onChange={() => setEnemy({ kind: 'drawn' })}
                data-testid="enemy-drawn"
              />
              <span>
                <strong>{t('setup.enemyDrawn')}</strong>
                <small>{t('setup.enemyDrawnHint', { count: presets.length })}</small>
              </span>
            </label>
            {presets.map((preset, index) => (
              <label key={index} className="setup-enemy-option">
                <input
                  type="radio"
                  name="enemy"
                  data-nav
                  checked={setup.enemy.kind === 'preset' && setup.enemy.index === index}
                  onChange={() => setEnemy({ kind: 'preset', index })}
                  data-testid={`enemy-preset-${index}`}
                />
                <span>
                  <strong>{t('setup.enemyPreset', { letter: presetLetter(index), men: rosterMen(preset) })}</strong>
                  <small data-testid={`enemy-preset-${index}-armies`}>{armyList(preset)}</small>
                  <small>{sectionList(preset.sections)}</small>
                </span>
              </label>
            ))}
            <label className="setup-enemy-option">
              <input
                type="radio"
                name="enemy"
                data-nav
                checked={setup.enemy.kind === 'built'}
                onChange={() => setEnemy(setup.enemy.kind === 'built' ? setup.enemy : builtEnemy('legalista'))}
                data-testid="enemy-built"
              />
              <span>
                <strong>{t('setup.enemyBuilt')}</strong>
                <small>{t('setup.enemyBuiltHint')}</small>
              </span>
            </label>
          </div>
          {setup.enemy.kind === 'built' ? (
            <>
              <div className="setup-enemy-army" role="radiogroup" aria-label={t('setup.enemyArmy')}>
                {ENEMY_ARMY_IDS.map((army) => (
                  <label key={army} className="setup-enemy-army-option">
                    <input
                      type="radio"
                      name="enemy-army"
                      checked={setup.enemy.kind === 'built' && setup.enemy.army === army}
                      onChange={() => setEnemy(builtEnemy(army))}
                      data-testid={`enemy-army-${army}`}
                    />
                    <span>{t(ARMIES[army].nameKey as MessageKey)}</span>
                  </label>
                ))}
              </div>
              <RosterBuilder
                locale={locale}
                roster={setup.enemy.roster}
                army={setup.enemy.army}
                onChange={(roster) => setup.enemy.kind === 'built' && setEnemy({ ...setup.enemy, roster })}
                testPrefix="enemy-roster"
                label={t('setup.enemy')}
              />
            </>
          ) : null}
        </section>

        <footer className="setup-footer">
          <button type="button" className="secondary" onClick={onBack} data-testid="setup-back">
            {t('setup.back')}
          </button>
          <button type="button" className="desk-stamp setup-start" disabled={!ready} onClick={onStart} data-testid="start-battle-3v3">
            <Users aria-hidden="true" size={16} />
            {t('setup.start')}
          </button>
        </footer>
      </div>
    </div>
  );
}
