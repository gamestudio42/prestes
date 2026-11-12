import { translate, type Locale } from '@prestes/content';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';

export interface MapEditorBinocularsProps {
  locale: Locale;
}

/** Where the map editor lives: its own page beside the game (add-map-editor). */
export const MAP_EDITOR_URL = './editor.html';

/**
 * The field glasses on the camp table (camp-tent-menu; before it, the
 * theodolite): a closed icon with its name below. They do not open in place;
 * choosing them goes to the map editor page.
 */
export function MapEditorBinoculars({ locale }: MapEditorBinocularsProps) {
  const art = DESK_ART.binoculars;
  return (
    <div className="desk-editor-cover desk-art-box" style={deskArtStyle(art)} {...deskArtData(art)}>
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
