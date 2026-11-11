import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CAMPAIGN_CHAPTERS,
  COMPENDIUM,
  COMPENDIUM_IMAGE_REGISTER,
  FIGURES,
  LOCALES,
  messages,
  parseNameRegister,
  SOURCE_KEYS,
  validateChapters,
  validateCodexEntry,
  validateCompendium,
  validateCompendiumMedia,
  validateFigures,
  validateMissionCommander,
  validateNameRegister,
  type MissionMetadata,
} from '@prestes/content';
import { ARMIES, SECTION_TYPES, validateArmies, validateSectionTypes, validateWeapons, WEAPONS } from '@prestes/shared';

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

// polish-menu-desk: compendium images and long text, and the campaign chapters.
errors.push(...validateCompendium());
errors.push(...validateCompendiumMedia());
const assetsText = readFileSync(resolve(root, 'docs/assets.md'), 'utf8');
for (const image of COMPENDIUM_IMAGE_REGISTER) {
  if (!existsSync(resolve(root, image.path))) errors.push(`missing compendium image: ${image.path}`);
  if (!assetsText.includes(`\`${image.path}\``)) {
    errors.push(`compendium image not in docs/assets.md: ${image.path}`);
  }
}
errors.push(...validateChapters());

// pre-battle-roster 1.1 and 1.3: every weapon is complete and named in every locale.
errors.push(...validateWeapons());
for (const weapon of Object.values(WEAPONS)) {
  for (const locale of LOCALES) {
    for (const key of [weapon.nameKey, weapon.shortNameKey, weapon.descriptionKey, `weapon.${weapon.id}.action`, `weapon.${weapon.id}.note`]) {
      if (!(key in messages[locale])) errors.push(`${weapon.id}: ${locale} has no ${key}`);
    }
  }
}

// pre-battle-roster 2.1: every section type is sound and named in every locale.
errors.push(...validateSectionTypes(SECTION_TYPES, Object.keys(WEAPONS)));
for (const type of Object.values(SECTION_TYPES)) {
  for (const locale of LOCALES) {
    for (const key of [type.nameKey, type.descriptionKey]) {
      if (!(key in messages[locale])) errors.push(`${type.id}: ${locale} has no ${key}`);
    }
  }
}

// faction-armies 2.4: every army is complete and named in every locale, and
// every army and section type name is in the forces document's register.
errors.push(...validateArmies());
for (const army of Object.values(ARMIES)) {
  for (const locale of LOCALES) {
    for (const key of [army.nameKey, army.descriptionKey]) {
      if (!(key in messages[locale])) errors.push(`${army.id}: ${locale} has no ${key}`);
    }
  }
}
const nameIds = [...Object.keys(ARMIES).map((id) => `army:${id}`), ...Object.keys(SECTION_TYPES).map((id) => `section:${id}`)];
errors.push(...validateNameRegister(parseNameRegister(readFileSync(resolve(root, 'docs/history/FORCES.md'), 'utf8')), nameIds, SOURCE_KEYS));

// author-game-maps 3.6: every battle map is an authored document; tools/check-maps.ts checks them.

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log(
  `Content check passed: ${FIGURES.length} figures, ${missions.length} missions, ${CAMPAIGN_CHAPTERS.length} chapters, ${COMPENDIUM.length} compendium entries, ${COMPENDIUM_IMAGE_REGISTER.length} images, ${SOURCE_KEYS.length} sources.`,
);
