import { describe, expect, it } from 'vitest';
import { LOCALES, messages } from '../../packages/content/src';
import { CATALOG_OBJECTS, LINE_KINDS } from '../../packages/shared/src';

// revise-buildings-and-stone 5.4: every catalog object and every line kind is
// named in English and Brazilian Portuguese, each name its own.
describe('editor catalog names', () => {
  const keys = [...CATALOG_OBJECTS.map((object) => object.nameKey), ...LINE_KINDS.map((line) => line.nameKey)];

  it('every object and line kind has a name in each locale', () => {
    for (const locale of LOCALES) {
      const missing = keys.filter((key) => !(messages[locale] as Record<string, string>)[key]?.trim());
      expect(missing, locale).toEqual([]);
    }
  });

  it('no two of them share a name in a locale', () => {
    for (const locale of LOCALES) {
      const names = [...new Set(keys)].map((key) => (messages[locale] as Record<string, string>)[key]);
      const repeated = names.filter((name, index) => names.indexOf(name) !== index);
      expect(repeated, locale).toEqual([]);
    }
  });
});
