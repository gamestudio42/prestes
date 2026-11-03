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
  BOOTCAMP_EXERCISE,
  CURRICULUM,
  type BootcampExercise,
  type ExerciseFailure,
  type ExerciseMarker,
  type ExerciseObjective,
  type ExerciseObjectiveKind,
  type ExercisePhase,
  type ExercisePhaseId,
  type ExercisePoint,
  type ExerciseSetup,
  type ObjectiveStartAction,
  type TrainingAction,
} from './bootcamp-exercise';
export {
  ORDER_CATALOG,
  ORDER_CATEGORY_LABELS,
  type OrderActivation,
  type OrderCategory,
  type OrderDefinition,
} from './order-catalog';


