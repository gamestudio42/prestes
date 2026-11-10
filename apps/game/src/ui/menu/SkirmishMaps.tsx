import type { CSSProperties } from 'react';
import type { BattleMap, BattleMapId } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { Troop as Users } from '../icons';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';

export interface SkirmishMapsProps {
  locale: Locale;
  /** author-game-maps 5.2: the authored skirmish maps (and the test map in dev), in the index's order. */
  maps: readonly BattleMap[];
  /** The last map chosen; its sheet lies on top. */
  battleMap: BattleMapId;
  /** Opens the setup screen on the given map. */
  onOpenSetup: (map: BattleMapId) => void;
  onSelect: (map: BattleMapId) => void;
}

/** The thumbnail the editor saves for a map (author-game-maps), or its rendered preview. */
/** A map's name or description: an authored map carries its own text, a hand-written one a message key. */
export function mapText(map: BattleMap, field: 'name' | 'description', locale: Locale): string {
  const own = map.text?.[field][locale] || map.text?.[field].en;
  return own || translate(locale, (field === 'name' ? map.nameKey : map.descriptionKey) as MessageKey);
}

export const mapThumbnail = (id: BattleMapId) => `${import.meta.env.BASE_URL}maps/${id}.png`;

/**
 * author-game-maps 5.2: one folded sheet on the desk per skirmish map, any
 * number of them, fanned; the chosen one lies on top. Selecting a sheet
 * underneath brings it up; selecting the top sheet, or its stamp, opens the
 * setup screen. With no map yet the desk shows an empty sheet that points
 * to the editor.
 */
export function SkirmishMaps({ locale, maps, battleMap, onOpenSetup, onSelect }: SkirmishMapsProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) => translate(locale, key, values);
  const art = DESK_ART.mapVilaMilitar;
  const top = maps.find((map) => map.id === battleMap) ?? maps[0];
  // The chosen sheet is drawn last; the others keep their order underneath.
  const ordered = top ? [...maps.filter((map) => map.id !== top.id), top] : [];

  return (
    <div className="desk-maps desk-object-body desk-art-box" style={deskArtStyle(art)} {...deskArtData(art)}>
      <div className={`desk-map-fan ${maps.length <= 1 ? 'desk-map-single' : ''}`} data-testid="skirmish-maps" data-count={maps.length}>
        {top === undefined ? (
          <div className="desk-map-sheet active desk-map-empty" style={{ '--i': 0 } as CSSProperties} data-testid="skirmish-empty">
            <img className="desk-map-art" src={art.src} width={art.width} height={art.height} alt="" draggable={false} />
            <div className="desk-map-legend">
              <p className="desk-map-title">{t('setup.noMaps')}</p>
            </div>
          </div>
        ) : (
          ordered.map((map, index) => {
            const active = map.id === top.id;
            const name = mapText(map, 'name', locale);
            return (
              <div
                key={map.id}
                className={`desk-map-sheet ${active ? 'active' : ''}`}
                style={{ '--i': ordered.length - 1 - index } as CSSProperties}
                data-testid={`skirmish-sheet-${map.id}`}
              >
                <img className="desk-map-art" src={art.src} width={art.width} height={art.height} alt="" draggable={false} />
                <img className="desk-map-thumb" src={mapThumbnail(map.id)} alt="" draggable={false} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
                <button
                  type="button"
                  className="desk-map-select"
                  aria-label={active ? t('setup.open', { name }) : name}
                  onClick={() => (active ? onOpenSetup(map.id) : onSelect(map.id))}
                  data-testid={active ? 'open-skirmish' : `select-skirmish-${map.id}`}
                />
                {active ? (
                  <div className="desk-map-legend">
                    <p className="desk-map-title">{name}</p>
                    <button type="button" className="desk-stamp" onClick={() => onOpenSetup(map.id)} data-testid="open-skirmish-stamp">
                      <Users aria-hidden="true" size={16} />
                      {t('setup.prepare')}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <span className="desk-object-label">{t('menu.cover.maps')}</span>
    </div>
  );
}
