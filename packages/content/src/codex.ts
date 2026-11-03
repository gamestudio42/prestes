import type { ContentLabel } from './figures';
import { isSourceKey } from './sources';

export interface CodexEntry {
  id: string;
  title: string;
  body: string;
  label?: ContentLabel;
  sourceRefs: readonly string[];
}

export const CONTENT_LABELS: readonly ContentLabel[] = [
  'historical',
  'dramatized',
  'fictional',
];

export function validateCodexEntry(entry: CodexEntry): string[] {
  const errors: string[] = [];
  if (!entry.title) {
    errors.push(`codex entry without title: ${entry.id}`);
  }
  if (!entry.body) {
    errors.push(`codex entry without body: ${entry.id}`);
  }
  if (!entry.label) {
    errors.push(`codex entry without label: ${entry.id}`);
  } else if (!CONTENT_LABELS.includes(entry.label)) {
    errors.push(`codex entry with invalid label: ${entry.id}`);
  }
  if (entry.sourceRefs.length === 0) {
    errors.push(`codex entry without sources: ${entry.id}`);
  }
  for (const source of entry.sourceRefs) {
    if (!isSourceKey(source)) {
      errors.push(`codex entry ${entry.id} references unknown source: ${source}`);
    }
  }
  return errors;
}
