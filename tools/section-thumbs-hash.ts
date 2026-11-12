import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ARMIES, SECTION_TYPES, type SectionTypeId } from '../packages/shared/src';

/**
 * troop-thumbnails-and-panel D1: what a section thumbnail is drawn from. The
 * type's men and weapons, the soldier model and its army's uniform textures;
 * a change to any of them makes the stored hash stale until `pnpm thumbs`.
 */
export const SECTION_THUMBS_DIR = 'apps/game/public/assets/sections';
const MODELS = 'apps/game/public/models';

export function sectionThumbHash(typeId: SectionTypeId, root = process.cwd()): string {
  const type = SECTION_TYPES[typeId];
  const uniform = ARMIES[type.army].uniform;
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ id: type.id, army: type.army, men: type.men }));
  const files = [`${MODELS}/soldier.glb`];
  for (const rank of ['troop', 'officer']) for (const variant of [0, 1, 2]) files.push(`${MODELS}/textures/soldier-${uniform}-${rank}-${variant}.png`);
  for (const file of files) {
    hash.update(file);
    hash.update(readFileSync(resolve(root, file)));
  }
  return hash.digest('hex').slice(0, 16);
}

/** What is wrong with each type's picture: missing, or drawn from other sources. */
export function sectionThumbProblems(root = process.cwd(), read: (path: string) => string | null = readOrNull): string[] {
  const problems: string[] = [];
  for (const typeId of Object.keys(SECTION_TYPES) as SectionTypeId[]) {
    const image = resolve(root, SECTION_THUMBS_DIR, `${typeId}.png`);
    const stored = read(resolve(root, SECTION_THUMBS_DIR, `${typeId}.hash`));
    if (read(image) === null) problems.push(`section thumbnail ${typeId}: missing ${SECTION_THUMBS_DIR}/${typeId}.png (run \`pnpm thumbs\`)`);
    else if (stored?.trim() !== sectionThumbHash(typeId, root)) problems.push(`section thumbnail ${typeId}: stale (run \`pnpm thumbs\`)`);
  }
  return problems;
}

function readOrNull(path: string): string | null {
  try {
    return readFileSync(path, 'latin1');
  } catch {
    return null;
  }
}
