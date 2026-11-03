import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// UTF-8 text decoded as Latin-1 turns "·" into "Â·", "°" into "Â°", "é" into
// "Ã©" and "—" into "â€”". Uppercase Portuguese such as "INSTRUÇÃO" is valid, so
// only a following Latin-1 continuation character counts as mojibake.
function hasMojibake(text: string): boolean {
  for (let index = 0; index < text.length - 1; index += 1) {
    const lead = text.charCodeAt(index);
    const next = text.charCodeAt(index + 1);
    if (
      (lead === 0xc2 && next >= 0xa0 && next <= 0xbf) ||
      (lead === 0xc3 && next >= 0x80 && next <= 0xbf) ||
      (lead === 0xe2 && next === 0x20ac)
    ) {
      return true;
    }
  }
  return false;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' || name === 'dist' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });
}

describe('source encoding', () => {
  it('has no mojibake in game or package sources', () => {
    const roots = ['apps/game/src', ...readdirSync('packages').map((name) => join('packages', name, 'src'))];
    const offenders = roots
      .flatMap((root) => sourceFiles(root))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ file, line: index + 1, text: line }))
          .filter(({ text }) => hasMojibake(text)),
      )
      .map(({ file, line, text }) => `${file}:${line}: ${text.trim()}`);
    expect(offenders).toEqual([]);
  });
});
