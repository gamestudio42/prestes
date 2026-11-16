import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkRelease, type RegisterRow } from '../../tools/check-release';

// prepare-online-release 4.1 (D6): the release check on small fixture builds.

let dist: string | null = null;
afterEach(() => {
  if (dist) rmSync(dist, { recursive: true, force: true });
  dist = null;
});

function file(path: string, body: string | number): void {
  dist ??= mkdtempSync(join(tmpdir(), 'prestes-release-'));
  const full = join(dist, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof body === 'number' ? Buffer.alloc(body) : body);
}

const REGISTER: RegisterRow[] = [
  { path: 'apps/game/public/assets/compendium/revolt/photo.png', licence: 'public-domain' },
  { path: 'art-src/compendium-pending/revolt/scan.png', licence: 'permission-pending' },
];
const BUDGET = { firstVisitMaxBytes: 10_000, totalMaxBytes: 50_000 };

/** A clean build: the page, an entry chunk with a lazy chunk, styles, a font and a registered image. */
function cleanBuild(): string {
  file('index.html', '<html></html>');
  file('assets/index-abc.js', 'console.log(1)');
  file('assets/react-abc.js', 'react');
  file('assets/index-abc.css', 'body{}');
  file('assets/font-abc.woff2', 1000);
  file('assets/campaign-abc.js', 2000);
  file('assets/compendium/revolt/photo.png', 3000);
  file(
    '.vite/manifest.json',
    JSON.stringify({
      'index.html': { file: 'assets/index-abc.js', isEntry: true, imports: ['_react.js'], css: ['assets/index-abc.css'], assets: ['assets/font-abc.woff2'], dynamicImports: ['campaign.ts'] },
      '_react.js': { file: 'assets/react-abc.js' },
      'campaign.ts': { file: 'assets/campaign-abc.js' },
    }),
  );
  return dist!;
}

describe('check-release', () => {
  it('a clean build passes and reports both sizes, the lazy chunk out of the first visit', () => {
    const report = checkRelease(cleanBuild(), BUDGET, REGISTER);
    expect(report.failures).toEqual([]);
    // index.html 13 + entry 14 + react 5 + css 6 + font 1000
    expect(report.firstVisitBytes).toBe(13 + 14 + 5 + 6 + 1000);
    expect(report.totalBytes).toBe(13 + 14 + 5 + 6 + 1000 + 2000 + 3000);
  });

  it('a permission-pending image fails, naming the image and its file', () => {
    cleanBuild();
    file('assets/compendium/revolt/scan.png', 10);
    const { failures } = checkRelease(dist!, BUDGET, REGISTER);
    expect(failures.join('\n')).toContain('assets/compendium/revolt/scan.png');
    expect(failures.join('\n')).toContain('art-src/compendium-pending/revolt/scan.png');
  });

  it('a compendium-pending path fails', () => {
    cleanBuild();
    file('art-src/compendium-pending/x.png', 10);
    expect(checkRelease(dist!, BUDGET, REGISTER).failures.join('\n')).toContain('compendium-pending/x.png');
  });

  it('a source map fails', () => {
    cleanBuild();
    file('assets/index-abc.js.map', '{}');
    expect(checkRelease(dist!, BUDGET, REGISTER).failures.join('\n')).toContain('index-abc.js.map: a source map');
  });

  it("the edit link's string fails", () => {
    cleanBuild();
    file('assets/index-abc.js', 'const label = "Edit this map";');
    expect(checkRelease(dist!, BUDGET, REGISTER).failures.join('\n')).toContain('assets/index-abc.js: holds the dev-only "Edit this map"');
  });

  it('an unregistered compendium image fails', () => {
    cleanBuild();
    file('assets/compendium/revolt/stray.png', 10);
    expect(checkRelease(dist!, BUDGET, REGISTER).failures.join('\n')).toContain('stray.png: a compendium image missing from the image register');
  });

  it('a first visit or a total over its limit fails', () => {
    cleanBuild();
    expect(checkRelease(dist!, { firstVisitMaxBytes: 100, totalMaxBytes: 50_000 }, REGISTER).failures.join('\n')).toContain('first visit');
    expect(checkRelease(dist!, { firstVisitMaxBytes: 10_000, totalMaxBytes: 100 }, REGISTER).failures.join('\n')).toContain("the build's");
  });
});
