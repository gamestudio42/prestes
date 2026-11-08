import { useState, type CSSProperties } from 'react';
import { battleMaps, type BattleMapId } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { Troop as Users } from '../icons';
import { MAP_ART, deskArtData, deskArtStyle } from './deskArt';

export interface SkirmishMapsProps {
  locale: Locale;
  battleMap: BattleMapId;
  onBattleMapChange: (map: BattleMapId) => void;
  onStartBattle3v3: () => void;
}

/**
 * The skirmish maps as a fan of folded sheets. The active sheet carries a
 * printed legend with the map's name, description and the deploy stamp, as if
 * the legend were part of the map. Selecting a sheet raises it; selecting the
 * active sheet cycles to the next one.
 */
export function SkirmishMaps({
  locale,
  battleMap,
  onBattleMapChange,
  onStartBattle3v3,
}: SkirmishMapsProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const maps = battleMaps();
  const selected = maps.find((map) => map.id === battleMap) ?? maps[0]!;
  const selectedIndex = maps.findIndex((map) => map.id === selected.id);
  const next = maps[(selectedIndex + 1) % maps.length]!;
  // refine-battle-maps 6.3: a map whose preview will not load shows its name only.
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <div
      className="desk-maps desk-object-body desk-art-box"
      style={deskArtStyle(MAP_ART[selected.id]!)}
      {...deskArtData(MAP_ART[selected.id]!)}
    >
      <div className="desk-map-fan" role="radiogroup" aria-label={t('start.battleMap')}>
        {maps.map((map, index) => {
          const active = map.id === selected.id;
          const name = t(map.nameKey as MessageKey);
          const description = t(map.descriptionKey as MessageKey);
          return (
            <div
              key={map.id}
              className={`desk-map-sheet ${active ? 'active' : ''}`}
              role="none"
              style={{ '--i': index } as CSSProperties}
            >
              <img
                className="desk-map-art"
                src={MAP_ART[map.id]!.src}
                width={MAP_ART[map.id]!.width}
                height={MAP_ART[map.id]!.height}
                alt=""
                draggable={false}
              />
              {missing.has(map.id) ? null : (
                <img
                  className="desk-map-preview"
                  src={`${import.meta.env.BASE_URL}maps/${map.id}.png`}
                  width={96}
                  height={96}
                  alt={t('start.mapPreview', { name })}
                  draggable={false}
                  data-testid={`map-preview-${map.id}`}
                  onError={() => setMissing((current) => new Set(current).add(map.id))}
                />
              )}
              <div
                role="radio"
                tabIndex={0}
                aria-checked={active}
                aria-label={`${name}. ${description}`}
                className="desk-map-select"
                onClick={() => onBattleMapChange(active ? next.id : map.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onBattleMapChange(active ? next.id : map.id);
                }}
                data-testid={`map-option-${map.id}`}
              />
              {active ? (
                <div className="desk-map-legend" title={description}>
                  <p className="desk-map-title">{name}</p>
                  <p className="desk-map-description">{description}</p>
                  <button
                    type="button"
                    className="desk-stamp"
                    onClick={onStartBattle3v3}
                    data-testid="start-battle-3v3"
                  >
                    <Users aria-hidden="true" size={16} />
                    {t('start.battle3v3')}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <span className="desk-object-label">{t('menu.cover.maps')}</span>
    </div>
  );
}
