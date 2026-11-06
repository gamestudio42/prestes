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

export {
  ORDER_CATALOG,
  ORDER_CATEGORY_LABELS,
  type OrderActivation,
  type OrderCategory,
  type OrderDefinition,
} from './order-catalog';


export {
  COMPENDIUM,
  COMPENDIUM_SECTIONS,
  compendiumBodyKey,
  compendiumTitleKey,
  validateCompendium,
  type CompendiumEntry,
  type CompendiumSection,
  type Confidence,
} from './compendium';
