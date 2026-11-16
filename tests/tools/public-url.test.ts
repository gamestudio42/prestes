import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicUrl } from '../../packages/shared/src/public-url';

// prepare-online-release 3.1 (D5): public files carry the build's version.

describe('publicUrl', () => {
  it('adds the build id as a version', () => {
    expect(publicUrl('./models/soldier.glb', 'abc123')).toBe('./models/soldier.glb?v=abc123');
    expect(publicUrl('music/track.mp3?x=1', 'abc123')).toBe('music/track.mp3?x=1&v=abc123');
    expect(publicUrl('maps/a.png#top', 'abc123')).toBe('maps/a.png?v=abc123#top');
  });

  it('leaves data, object and other-site URLs, and versioned ones, alone', () => {
    for (const url of ['data:image/png;base64,AAAA', 'blob:http://x/1', 'https://example.org/a.png', 'a.png?v=old']) {
      expect(publicUrl(url, 'abc123')).toBe(url);
    }
  });

  it('two builds give two different URLs', () => {
    expect(publicUrl('models/a.glb', 'one')).not.toBe(publicUrl('models/a.glb', 'two'));
  });
});

/**
 * Every source file that names a public-folder file must version it. view3d's
 * files are versioned by `versionPublicUrls` (three's loading manager), and
 * useAudio hands its base to ShotAudio, which versions each fetch.
 */
const VERSIONED_ELSEWHERE = new Set(['apps/game/src/hooks/useAudio.ts']);
const PUBLIC_LITERAL = /(?:['"`]|BASE_URL\})\.?\/?(?:models|audio|music|video|maps|assets\/(?:sections|compendium))\//;

function sources(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, found);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) found.push(path);
  }
  return found;
}

describe('public file URLs in the source', () => {
  it('every file naming a public file goes through publicUrl', () => {
    const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const files = ['apps/game/src', ...readdirSync(join(root, 'packages')).map((name) => `packages/${name}/src`)].flatMap((dir) => sources(join(root, dir)));
    const offenders = files
      .map((path) => relative(root, path).split('\\').join('/'))
      .filter((path) => !path.startsWith('packages/view3d/') && !VERSIONED_ELSEWHERE.has(path))
      .filter((path) => {
        const text = readFileSync(join(root, path), 'utf8')
          .split('\n')
          .filter((line) => !/^\s*(\*|\/\/|import )/.test(line))
          .join('\n');
        return PUBLIC_LITERAL.test(text) && !text.includes('publicUrl(');
      });
    expect(offenders).toEqual([]);
  });

  it('view3d versions every three.js load', () => {
    const main = readFileSync(new URL('../../apps/game/src/main.tsx', import.meta.url), 'utf8');
    const editor = readFileSync(new URL('../../apps/game/src/editor/main.tsx', import.meta.url), 'utf8');
    expect(main).toContain('versionPublicUrls()');
    expect(editor).toContain('versionPublicUrls()');
  });
});
