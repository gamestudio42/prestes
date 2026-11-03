import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  LOCALES,
  SOURCE_LOCALE,
  messages,
  validateLocaleKeys,
} from '@prestes/content';

const errors: string[] = [];

for (const locale of LOCALES) {
  const diff = validateLocaleKeys(messages[locale], messages[SOURCE_LOCALE]);
  for (const key of diff.missing) {
    errors.push(`${locale}: missing key ${key}`);
  }
  for (const key of diff.extra) {
    errors.push(`${locale}: extra key ${key}`);
  }
}

function walk(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
    } else if (path.endsWith('.tsx')) {
      files.push(path);
    }
  }
  return files;
}

const uiRoot = resolve(process.cwd(), 'apps/game/src');
const jsxText = />\s*([A-Za-z][A-Za-z0-9 ,.'!?À-ÿ-]*)\s*</;
const hardcodedAttribute = /\b(?:title|aria-label|placeholder|alt)="([^"]*[A-Za-z][^"]*)"/;

for (const file of walk(uiRoot)) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const textMatch = jsxText.exec(line);
    if (textMatch) {
      errors.push(`${file}:${index + 1}: hardcoded JSX text "${textMatch[1]?.trim()}"`);
    }
    const attributeMatch = hardcodedAttribute.exec(line);
    if (attributeMatch) {
      errors.push(`${file}:${index + 1}: hardcoded attribute text "${attributeMatch[1]}"`);
    }
  });
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

const keyCount = Object.keys(messages[SOURCE_LOCALE]).length;
console.log(`Locale check passed: ${LOCALES.length} locales, ${keyCount} keys.`);
