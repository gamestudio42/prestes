import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { messages } from '../../packages/content/src';

// prepare-online-release 1.1 (D1): the splash's text lives in index.html and in the locales; they must match.

const html = readFileSync(new URL('../../apps/game/index.html', import.meta.url), 'utf8');
const table = JSON.parse(/<script id="splash-text" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1]!) as Record<
  string,
  Record<string, string>
>;

describe('opening splash text', () => {
  for (const locale of ['en', 'pt-BR'] as const) {
    it(`index.html's ${locale} table equals the locale's splash.* keys`, () => {
      const fromLocale = Object.fromEntries(Object.entries(messages[locale]).filter(([key]) => key.startsWith('splash.')));
      expect(table[locale]).toEqual(fromLocale);
    });
  }

  it('every text slot of the splash has a string', () => {
    const slots = [...html.matchAll(/data-text="([^"]+)"/g)].map((match) => match[1]!);
    expect(slots.length).toBeGreaterThan(5);
    for (const slot of slots) {
      expect(table.en![slot]).toBeTruthy();
      expect(table['pt-BR']![slot]).toBeTruthy();
    }
  });

  it('the inline script imports nothing', () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]!).join('\n');
    expect(inline).not.toMatch(/\bimport\b/);
  });
});
