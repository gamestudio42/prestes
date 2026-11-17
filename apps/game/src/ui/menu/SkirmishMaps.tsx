import { publicUrl } from '@prestes/shared';
import type { CSSProperties } from 'react';
import type { BattleMap, BattleMapId } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { playerPrint } from './playerMaps';
import { DESK_ART, MAP_SHEET_WINDOW, deskArtData, deskArtStyle } from './deskArt';

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

/** A map's name or description: an authored map carries its own text, a hand-written one a message key. */
export function mapText(map: BattleMap, field: 'name' | 'description', locale: Locale): string {
  const own = map.text?.[field][locale] || map.text?.[field].en;
  // A map with its own text (an authored or player map) never falls back to a message key.
  if (map.text) return own || (field === 'name' ? map.id : '');
  return own || translate(locale, (field === 'name' ? map.nameKey : map.descriptionKey) as MessageKey);
}

/** The thumbnail the editor saves for a map (author-game-maps), or its rendered preview. */
export const mapThumbnail = (id: BattleMapId) => playerPrint(id) ?? publicUrl(`${import.meta.env.BASE_URL}maps/${id}.png`);

/** How many sheets under the top one are spread out; deeper ones lie square under the last. */
const PILE_SPREAD = 4;

/**
 * Where a sheet under the top one lies, in art pixels and degrees: each one a
 * little further out to one side or the other, higher up, and turned, so the
 * edge of every map shows above and beside the top one. They always lie
 * higher than the top sheet, so its bottom edge stays the pile's lowest and
 * the label keeps the desk's gap. The turns come from the map's id, so a
 * sheet keeps its lie between visits.
 */
export function pileLie(id: string, depth: number): { x: number; y: number; turn: number } {
  if (depth === 0) return { x: 0, y: 0, turn: 0 };
  let hash = 7;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const step = Math.min(depth, PILE_SPREAD);
  const side = depth % 2 === 1 ? 1 : -1;
  const turn = side * (4 + (hash % 4));
  return { x: side * (8 + step * 4), y: -(6 + step * 5), turn };
}

/**
 * camp-tent-menu: the skirmish maps are a pile of cards on the camp table,
 * one card per map, any number of them. The chosen map lies on top, square,
 * with its print and its name, and choosing it opens the setup screen; the
 * others lie loose underneath, each turned a little so its edge shows.
 * Choosing a card underneath brings it to the top; choosing the top card
 * opens the setup screen. With no map yet the pile is one blank
 * card.
 */
export function SkirmishMaps({ locale, maps, battleMap, onOpenSetup, onSelect }: SkirmishMapsProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) => translate(locale, key, values);
  const art = DESK_ART.mapSheet;
  const top = maps.find((map) => map.id === battleMap) ?? maps[0];
  // The chosen sheet is drawn last; the others keep their order underneath.
  const ordered = top ? [...maps.filter((map) => map.id !== top.id), top] : [];
  const windowStyle = {
    '--win-x0': MAP_SHEET_WINDOW.x0,
    '--win-y0': MAP_SHEET_WINDOW.y0,
    '--win-x1': MAP_SHEET_WINDOW.x1,
    '--win-y1': MAP_SHEET_WINDOW.y1,
  } as CSSProperties;

  return (
    <div className="desk-maps desk-object-body desk-art-box" style={{ ...deskArtStyle(art), ...windowStyle }} {...deskArtData(art)}>
      <div className={`desk-map-pile ${maps.length <= 1 ? 'desk-map-single' : ''}`} data-testid="skirmish-maps" data-count={maps.length}>
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
            const depth = ordered.length - 1 - index;
            const lie = pileLie(map.id, depth);
            const name = mapText(map, 'name', locale);
            return (
              <div
                key={map.id}
                className={`desk-map-sheet ${active ? 'active' : ''}`}
                style={{ '--i': depth, '--lie-x': lie.x, '--lie-y': lie.y, '--lie-turn': `${lie.turn}deg` } as CSSProperties}
                data-testid={`skirmish-sheet-${map.id}`}
              >
                {/* The print lies under the card, showing through its window. */}
                <div className="desk-map-print" data-testid={`skirmish-print-${map.id}`}>
                  <img className="desk-map-thumb" src={mapThumbnail(map.id)} alt="" draggable={false} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
                </div>
                <img className="desk-map-art" src={art.src} width={art.width} height={art.height} alt="" draggable={false} />
                <button
                  type="button"
                  className="desk-map-select"
                  aria-label={active ? t('setup.open', { name }) : name}
                  title={name}
                  onClick={() => (active ? onOpenSetup(map.id) : onSelect(map.id))}
                  data-testid={active ? 'open-skirmish' : `select-skirmish-${map.id}`}
                />
                {active ? (
                  <div className="desk-map-legend">
                    <p className="desk-map-title">{name}</p>
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

