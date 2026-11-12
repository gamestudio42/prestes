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
   * Empty art rows under the lowest opaque pixel. The label is pulled up by
   * them so every label sits the same distance below its art. Every current
   * sprite touches its bottom row, so none sets it.
   */
  trim?: number;
}

/** Every closed desk object is drawn at this scale (one art pixel = 2 px). */
export const DESK_SCALE = 2;

/**
 * The desk's pixel-art sprites. The closed books are rasterized from reference
 * photographs supplied by the project owner and cleaned up in Aseprite
 * (tools/aseprite/desk-cleanup.lua); the reference pile and the gramophone are
 * still the first rasterized versions; the compass is drawn by
 * tools/aseprite/desk-draw.lua; the open books are
 * drawn in CSS (menu-desk.css). They are imported by
 * Vite, so the built game carries them without a runtime path.
 */
export const DESK_ART = {
  campaignClosed: { src: campaignBookClosed, width: 128, height: 96 },
  compendiumClosed: { src: compendiumBookClosed, width: 128, height: 96 },
  compassClosed: { src: compassClosed, width: 64, height: 64 },
  compassOpen: { src: compassOpen, width: 64, height: 64 },
  // The folded sheet every skirmish map is drawn on (the thumbnail lies over it).
  mapSheet: { src: mapSheet, width: 128, height: 120 },
  referencesPile: { src: referencesBooks, width: 128, height: 80 },
  gramophoneBody: { src: gramophoneBody, width: 120, height: 160 },
  gramophoneGrooves: { src: gramophoneGrooves, width: 64, height: 32 },
  gramophoneRecord: { src: gramophoneRecord, width: 30, height: 30 },
  // add-map-editor: drawn in code by tools/build-desk-theodolite.ts.
  theodolite: { src: theodolite, width: 64, height: 80 },
} as const satisfies Record<string, DeskArt>;

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
  };
}
