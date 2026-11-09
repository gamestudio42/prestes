import type { CSSProperties } from 'react';
import { battleMaps, type BattleMapId } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { Troop as Users } from '../icons';
import { MAP_ART, deskArtData, deskArtStyle } from './deskArt';

export interface SkirmishMapsProps {
  locale: Locale;
  /** The last map chosen on the setup screen; its sheet lies on the desk. */
  battleMap: BattleMapId;
  onOpenSetup: () => void;
}

/**
 * pre-battle-roster 5.1: one folded map on the desk, the skirmish. It shows
 * the last map chosen; selecting it, or its stamp, opens the setup screen
 * where the map, the enemy and the force are chosen.
 */
export function SkirmishMaps({ locale, battleMap, onOpenSetup }: SkirmishMapsProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) => translate(locale, key, values);
  const maps = battleMaps();
  const selected = maps.find((map) => map.id === battleMap) ?? maps[0]!;
  const art = MAP_ART[selected.id] ?? MAP_ART['vila-militar']!;
  const name = t(selected.nameKey as MessageKey);

  return (
    <div className="desk-maps desk-object-body desk-art-box" style={deskArtStyle(art)} {...deskArtData(art)}>
      <div className="desk-map-fan desk-map-single">
        <div className="desk-map-sheet active" style={{ '--i': 0 } as CSSProperties}>
          <img className="desk-map-art" src={art.src} width={art.width} height={art.height} alt="" draggable={false} />
          <button
            type="button"
            className="desk-map-select"
            aria-label={t('setup.open', { name })}
            onClick={onOpenSetup}
            data-testid="open-skirmish"
          />
          <div className="desk-map-legend">
            <p className="desk-map-title">{name}</p>
            <button type="button" className="desk-stamp" onClick={onOpenSetup} data-testid="open-skirmish-stamp">
              <Users aria-hidden="true" size={16} />
              {t('setup.prepare')}
            </button>
          </div>
        </div>
      </div>
      <span className="desk-object-label">{t('menu.cover.maps')}</span>
    </div>
  );
}
