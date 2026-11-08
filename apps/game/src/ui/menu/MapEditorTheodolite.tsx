import { translate, type Locale } from '@prestes/content';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';

export interface MapEditorTheodoliteProps {
  locale: Locale;
}

/** Where the map editor lives: its own page beside the game (add-map-editor). */
export const MAP_EDITOR_URL = './editor.html';

/**
 * The surveyor's theodolite on the desk: a closed icon with its name below.
 * It does not open in place; choosing it goes to the map editor page.
 */
export function MapEditorTheodolite({ locale }: MapEditorTheodoliteProps) {
  const art = DESK_ART.theodolite;
  return (
    <div className="desk-theodolite-cover desk-art-box" style={deskArtStyle(art)} {...deskArtData(art)}>
      <img
        className="desk-object-art desk-object-art-closed"
        src={art.src}
        width={art.width}
        height={art.height}
        alt=""
        draggable={false}
      />
      <span className="desk-object-label">{translate(locale, 'menu.maps.editor')}</span>
    </div>
  );
}
