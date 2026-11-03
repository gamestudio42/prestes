import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FIGURES,
  SOURCE_KEYS,
  validateCodexEntry,
  validateFigures,
  validateMissionCommander,
  type MissionMetadata,
} from '@prestes/content';

const root = process.cwd();
const errors: string[] = [];

const requiredDocs = [
  'docs/history/SOURCES.md',
  'docs/history/TIMELINE.md',
  'docs/history/FIGURES.md',
  'docs/history/SOURCE_POLICY.md',
  'docs/history/MACAULAY_NOTES.md',
  'docs/history/CHAPTER_SOURCES.md',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    errors.push(`missing history document: ${doc}`);
  }
}

const sourcesText = readFileSync(resolve(root, 'docs/history/SOURCES.md'), 'utf8');
for (const key of SOURCE_KEYS) {
  if (!sourcesText.includes(`\`${key}\``)) {
    errors.push(`SOURCE_KEYS entry not registered in SOURCES.md: ${key}`);
  }
}

errors.push(...validateFigures(FIGURES, SOURCE_KEYS));

const missions: MissionMetadata[] = [
  {
    id: 'prologue',
    commanderId: 'siqueira-campos',
    perspective: 'Forte de Copacabana, 1922',
    historicalDate: '1922-07-05',
    sourceRefs: ['macaulay-1974', 'helio-1922'],
  },
  {
    id: 'anel-de-ferro',
    commanderId: 'luis-carlos-prestes',
    perspective: 'São Luiz Gonzaga, 1924',
    historicalDate: '1924-12',
    sourceRefs: ['macaulay-1974', 'blanc-2024'],
  },
];

for (const mission of missions) {
  errors.push(...validateMissionCommander(mission));
}

errors.push(
  ...validateCodexEntry({
    id: 'forte-1922',
    title: 'The Forte de Copacabana',
    body: 'Placeholder codex entry.',
    label: 'historical',
    sourceRefs: ['macaulay-1974', 'helio-1922'],
  }),
);

const timeline = readFileSync(resolve(root, 'docs/history/TIMELINE.md'), 'utf8');
const corrections = [
  'Prestes was not at the Forte de Copacabana',
  'São Paulo 1924 was a separate front',
  'Miguel Costa was the formal commander',
  'Tocantins did not exist',
];

for (const correction of corrections) {
  if (!timeline.includes(correction)) {
    errors.push(`TIMELINE.md is missing correction: ${correction}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log(
  `Content check passed: ${FIGURES.length} figures, ${missions.length} missions, ${SOURCE_KEYS.length} sources.`,
);
