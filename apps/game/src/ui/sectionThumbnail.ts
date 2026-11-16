import { publicUrl } from '@prestes/shared';
import type { SectionTypeId } from '@prestes/shared';

/** troop-thumbnails-and-panel D1-D2: a section type's picture, built by `pnpm thumbs`. */
export const sectionThumbnail = (type: SectionTypeId): string => publicUrl(`${import.meta.env.BASE_URL}assets/sections/${type}.png`);
