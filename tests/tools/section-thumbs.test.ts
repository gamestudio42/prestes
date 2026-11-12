import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECTION_TYPES, type SectionTypeId } from '../../packages/shared/src';
import { sectionThumbHash, sectionThumbProblems } from '../../tools/section-thumbs-hash';

/**
 * troop-thumbnails-and-panel 1.3: a missing picture or one drawn from other
 * sources fails the content check and names the type.
 */
const ids = Object.keys(SECTION_TYPES) as SectionTypeId[];

/** A file system with every picture and its current hash, then one change. */
function files(change: (path: string) => string | null | undefined = () => undefined) {
  return (path: string): string | null => {
    const changed = change(path.replace(/\\/g, '/'));
    if (changed !== undefined) return changed;
    const id = ids.find((each) => path.replace(/\\/g, '/').endsWith(`/${each}.hash`));
    return id ? `${sectionThumbHash(id)}\n` : 'png';
  };
}

describe('section thumbnails in the content check (1.3)', () => {
  it('every type with its picture and current hash passes', () => {
    expect(sectionThumbProblems(process.cwd(), files())).toEqual([]);
  });

  it('a missing picture fails and names the type', () => {
    const problems = sectionThumbProblems(process.cwd(), files((path) => (path.endsWith('/jaguncos.png') ? null : undefined)));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^section thumbnail jaguncos: missing .*pnpm thumbs/);
  });

  it('a stale hash fails and names the type', () => {
    const problems = sectionThumbProblems(process.cwd(), files((path) => (path.endsWith('/metralhadora.hash') ? '0000000000000000\n' : undefined)));
    expect(problems).toEqual(['section thumbnail metralhadora: stale (run `pnpm thumbs`)']);
  });

  it("the hash follows the type's men and its army's uniforms", () => {
    expect(sectionThumbHash('fuzileiros')).not.toBe(sectionThumbHash('esquadra-4'));
    expect(sectionThumbHash('fuzileiros')).toBe(sectionThumbHash('fuzileiros'));
    // The committed pictures are current.
    for (const id of ids) expect(readFileSync(`apps/game/public/assets/sections/${id}.hash`, 'utf8').trim(), id).toBe(sectionThumbHash(id));
  });
});
