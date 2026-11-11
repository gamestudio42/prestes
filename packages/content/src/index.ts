export {
  LOCALES,
  SOURCE_LOCALE,
  messages,
  resolveLocale,
  translate,
  validateLocaleKeys,
  type Locale,
  type LocaleKeyDiff,
  type MessageKey,
} from './locales';
export {
  FIGURES,
  validateFigures,
  validateMissionCommander,
  type ContentLabel,
  type HistoricalFigure,
  type MissionMetadata,
} from './figures';
export { CONTENT_LABELS, validateCodexEntry, type CodexEntry } from './codex';
export { SOURCE_KEYS, isSourceKey, type SourceKey } from './sources';
export { parseNameRegister, validateNameRegister, type NameRow, type NameStatus } from './name-register';

export {
  ORDER_CATALOG,
  ORDER_CATEGORY_LABELS,
  type OrderActivation,
  type OrderCategory,
  type OrderDefinition,
} from './order-catalog';

export {
  COMPENDIUM,
  COMPENDIUM_IMAGE_REGISTER,
  COMPENDIUM_SECTIONS,
  COMPENDIUM_TEXT,
  compendiumBodyKey,
  compendiumText,
  compendiumTitleKey,
  validateCompendium,
  validateCompendiumMedia,
  type CompendiumEntry,
  type CompendiumText,
  type ImageRef,
  type NoteSection,
  type RegisteredImage,
  type CompendiumSection,
  type Confidence,
} from './compendium';

export {
  CAMPAIGN_CHAPTERS,
  CHAPTER_PAGE_WORD_BUDGET,
  CHAPTER_TEXT,
  chapterText,
  validateChapters,
  type CampaignChapter,
  type ChapterImage,
  type ChapterPage,
  type ChapterText,
} from './campaign/chapters';
