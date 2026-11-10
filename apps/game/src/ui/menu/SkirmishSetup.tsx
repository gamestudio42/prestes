import { useEffect, useRef, useState } from 'react';
import { mapText } from './SkirmishMaps';
import { rosterMen, SECTION_TYPES, type BattleMap, type BattleMapId } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { Troop as Users } from '../icons';
import { moveFocus, RosterBuilder } from './RosterBuilder';
import { setupReady, withMap, type EnemyChoice, type SkirmishSetup as Setup } from './setupState';

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
  const preview = (id: BattleMapId) => `${import.meta.env.BASE_URL}maps/${id}.png`;

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

  return (
    <div className="skirmish-setup" role="dialog" aria-modal="true" aria-labelledby="skirmish-setup-title" data-testid="skirmish-setup">
      <div className="setup-board">
        <header className="setup-header">
          <h2 id="skirmish-setup-title" tabIndex={-1} ref={titleRef}>
            {t('menu.mark.skirmish')}
          </h2>
          <p>{t('setup.subtitle')}</p>
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
            )}
            <figcaption>
              <strong>{mapText(map, 'name', locale)}</strong>
              <span>{mapText(map, 'description', locale)}</span>
            </figcaption>
          </figure>
        </section>

        <section className="setup-column setup-force" aria-labelledby="setup-force-title">
          <h3 id="setup-force-title">{t('setup.yourForce')}</h3>
          <RosterBuilder
            locale={locale}
            roster={setup.roster}
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
                onChange={() =>
                  setEnemy({ kind: 'built', roster: setup.enemy.kind === 'built' ? setup.enemy.roster : { sections: [...(presets[0]?.sections ?? setup.roster.sections)] } })
                }
                data-testid="enemy-built"
              />
              <span>
                <strong>{t('setup.enemyBuilt')}</strong>
                <small>{t('setup.enemyBuiltHint')}</small>
              </span>
            </label>
          </div>
          {setup.enemy.kind === 'built' ? (
            <RosterBuilder
              locale={locale}
              roster={setup.enemy.roster}
              onChange={(roster) => setEnemy({ kind: 'built', roster })}
              testPrefix="enemy-roster"
              label={t('setup.enemy')}
            />
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
