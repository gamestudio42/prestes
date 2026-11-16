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
  validateMapCommander,
  validateMissionCommander,
  type ContentLabel,
  type HistoricalFigure,
  type MapCommanderRef,
  type MissionMetadata,
} from './figures';
export { CONTENT_LABELS, validateCodexEntry, type CodexEntry } from './codex';
export {
  SOURCE_KEYS,
  SOURCE_RIGHTS,
  isQuotable,
  isSourceKey,
  parseSourceRightsTable,
  validateSourceRights,
  type Consultation,
  type SourceKey,
  type SourceRights,
  type SourceRightsEntry,
  type SourceRightsRow,
} from './sources';
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
  IMAGE_LICENCES,
  PENDING_IMAGE_DIR,
  type ImageLicence,
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
  chapterMapId,
  chapterText,
  isChapterPlayable,
  validateChapterMaps,
  validateChapters,
  type CampaignChapter,
  type ChapterImage,
  type ChapterPage,
  type ChapterText,
} from './campaign/chapters';

export {
  CITATION_PER_SOURCE,
  CITATION_WORD_LIMIT,
  QUOTE_WORD_LIMIT,
  quoteWords,
  validateQuotes,
  type Quote,
} from './quotes';

export {
  BIBLIOGRAPHY,
  sourceShort,
  validateBibliography,
  type BibliographyRow,
  type SourceTier,
} from './bibliography';

// complete-books-and-bibliography D7: no provisional text in the books.
export { PROVISIONAL_PHRASES, provisionalPhrase, validateProvisionalText } from './provisional';
