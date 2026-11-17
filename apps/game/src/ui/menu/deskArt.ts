import campaignBookClosed from '../../assets/menu/desk/campaign-book-closed.png';
import compendiumBookClosed from '../../assets/menu/desk/compendium-book-closed.png';
import compassClosed from '../../assets/menu/desk/compass-closed.png';
import compassOpen from '../../assets/menu/desk/compass-open.png';
import mapSheet from '../../assets/menu/desk/map-sheet.png';
import referencesBooks from '../../assets/menu/desk/references-books.png';
import gramophoneBody from '../../assets/menu/desk/gramophone-body.png';
import gramophoneGrooves from '../../assets/menu/desk/gramophone-grooves.png';
import gramophoneRecord from '../../assets/menu/desk/gramophone-record.png';
import theodolite from '../../assets/menu/desk/theodolite.png';
import binoculars from '../../assets/menu/desk/binoculars.png';

import type { CSSProperties } from 'react';

export interface DeskArt {
  src: string;
  /** Source pixel size; CSS scales it by whole numbers. */
  width: number;
  height: number;
  /**
   * On-screen scale of a closed desk sprite when it is not the desk standard.
   * Only sprites still waiting for their redraw set it; see PENDING_REDRAW.
   */
  scale?: number;
  /**
   * Art rows under the object's body that the label does not keep clear of:
   * empty rows, or a part that hangs below it (the binoculars' strap). The
   * label is pulled up by them so every label sits the same distance below
   * its object.
   */
  trim?: number;
}

/** Every closed desk object is drawn at this scale (one art pixel = 2 px). */
export const DESK_SCALE = 2;

/**
 * The desk's pixel-art sprites. camp-tent-menu: the books, the reference pile,
 * the record player, the compass and the binoculars are rasterized and cut
 * from the owner's item sheet (`referencias para hud/Itens do Menu em Pixel
 * Art.png`) by tools/menu/camp_pieces.py, which also draws the map sheet and
 * the record's groove layer. The open compass and the theodolite are the
 * earlier sprites, no longer laid on the desk; the open books are drawn in
 * CSS (menu-desk.css). They are imported by Vite, so the built game carries
 * them without a runtime path.
 */
export const DESK_ART = {
  campaignClosed: { src: campaignBookClosed, width: 112, height: 105 },
  compendiumClosed: { src: compendiumBookClosed, width: 146, height: 110 },
  compassClosed: { src: compassClosed, width: 101, height: 99 },
  compassOpen: { src: compassOpen, width: 64, height: 64 },
  // The card every skirmish map is printed on; the print shows through its window (MAP_SHEET_WINDOW).
  mapSheet: { src: mapSheet, width: 144, height: 136 },
  referencesPile: { src: referencesBooks, width: 144, height: 90 },
  gramophoneBody: { src: gramophoneBody, width: 133, height: 140 },
  gramophoneGrooves: { src: gramophoneGrooves, width: 58, height: 25 },
  gramophoneRecord: { src: gramophoneRecord, width: 30, height: 30 },
  // add-map-editor: drawn in code by tools/build-desk-theodolite.ts.
  theodolite: { src: theodolite, width: 64, height: 80 },
  // camp-tent-menu: the field glasses that open the map editor.
  // The strap hangs 14 rows below the glasses; the label lies over it (the owner, 2026-11-16).
  binoculars: { src: binoculars, width: 149, height: 87, trim: 14 },
} as const satisfies Record<string, DeskArt>;

/** The map sheet's window in art pixels (x0, y0, x1, y1): the print lies under it. */
export const MAP_SHEET_WINDOW = { x0: 26, y0: 8, x1: 118, y1: 100 } as const;

/** Closed sprites that are not yet drawn for the 2x desk standard. */
export const PENDING_REDRAW = Object.entries(DESK_ART as Record<string, DeskArt>)
  .filter(([, art]) => art.scale !== undefined && art.scale !== DESK_SCALE)
  .map(([key]) => key);

/**
 * CSS variables that size a closed sprite's box from its source size, so the
 * box and the PNG cannot drift apart. A sprite with its own `scale` follows
 * `--desk-scale` by the same ratio.
 */
export function deskArtStyle(art: DeskArt): CSSProperties {
  return {
    '--art-w': art.width,
    '--art-h': art.height,
    '--art-ratio': (art.scale ?? DESK_SCALE) / DESK_SCALE,
    '--art-trim': art.trim ?? 0,
  } as CSSProperties;
}

/** Data attributes that let tests read a closed sprite's source size and scale. */
export function deskArtData(art: DeskArt) {
  return {
    'data-art-w': art.width,
    'data-art-h': art.height,
    'data-art-scale': art.scale ?? DESK_SCALE,
    'data-art-trim': art.trim ?? 0,
  };
}
